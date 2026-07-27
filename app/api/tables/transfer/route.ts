import { NextResponse } from "next/server";
import { DiningSessionStatus, TableStatus } from "@prisma/client";
import { getCurrentActor } from "@/lib/server-auth";
import { prisma } from "@/lib/prisma";
import { activeTableOrderStatuses } from "@/lib/table-session-flow";
import {
  ensureTableQrConfig,
  rotateTableQrConfig,
} from "@/lib/table-qr";

const transferRoles = ["ADMIN", "STAFF", "CASHIER", "SERVER"] as const;

function normalizeId(value: unknown) {
  const id = typeof value === "number" ? value : Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function POST(request: Request) {
  const actor = await getCurrentActor();

  if (!actor || !transferRoles.includes(actor.role as (typeof transferRoles)[number])) {
    return NextResponse.json(
      { message: "Bạn không có quyền chuyển hoặc gộp bàn." },
      { status: 403 },
    );
  }

  const body = await request.json().catch(() => null);
  const fromTableId = normalizeId(body?.fromTableId);
  const toTableId = normalizeId(body?.toTableId);
  const merge = body?.merge === true;

  if (!fromTableId || !toTableId || fromTableId === toTableId) {
    return NextResponse.json(
      { message: "Bàn nguồn và bàn đích không hợp lệ." },
      { status: 400 },
    );
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      // Always lock in id order so two opposite transfer requests cannot
      // deadlock while moving orders between the same tables.
      for (const tableId of [fromTableId, toTableId].sort((a, b) => a - b)) {
        await tx.$queryRaw`
          SELECT id
          FROM cafe_tables
          WHERE id = ${tableId}
          FOR UPDATE
        `;
      }

      const [sourceTable, targetTable] = await Promise.all([
        tx.cafeTable.findUnique({
          where: { id: fromTableId },
          select: { id: true, name: true, status: true },
        }),
        tx.cafeTable.findUnique({
          where: { id: toTableId },
          select: { id: true, name: true, status: true },
        }),
      ]);

      if (!sourceTable || !targetTable) {
        throw new Error("TABLE_NOT_FOUND");
      }

      if (targetTable.status === TableStatus.RESERVED) {
        throw new Error("TARGET_RESERVED");
      }

      const activeOrders = await tx.order.findMany({
        where: {
          tableId: fromTableId,
          status: { in: [...activeTableOrderStatuses] },
        },
        select: { id: true },
      });

      if (activeOrders.length === 0) {
        throw new Error("SOURCE_EMPTY");
      }

      const targetHasActiveOrders = await tx.order.count({
        where: {
          tableId: toTableId,
          status: { in: [...activeTableOrderStatuses] },
        },
      });

      if (targetHasActiveOrders > 0 && !merge) {
        throw new Error("MERGE_REQUIRED");
      }

      const sourceSession = await tx.diningSession.findFirst({
        where: {
          tableId: fromTableId,
          status: DiningSessionStatus.OPEN,
        },
        select: { id: true },
      });
      let targetSession = await tx.diningSession.findFirst({
        where: {
          tableId: toTableId,
          status: DiningSessionStatus.OPEN,
        },
        select: { id: true },
      });
      let createdTargetSession = false;

      if (!targetSession) {
        targetSession = await tx.diningSession.create({
          data: {
            tableId: toTableId,
            status: DiningSessionStatus.OPEN,
          },
          select: { id: true },
        });
        createdTargetSession = true;
      }

      await tx.order.updateMany({
        where: {
          id: { in: activeOrders.map((order) => order.id) },
        },
        data: {
          tableId: toTableId,
          sessionId: targetSession.id,
        },
      });

      if (sourceSession) {
        await tx.diningSession.update({
          where: { id: sourceSession.id },
          data: {
            status: DiningSessionStatus.CLOSED,
            closedAt: new Date(),
          },
        });
      }

      await tx.cafeTable.update({
        where: { id: fromTableId },
        data: { status: TableStatus.AVAILABLE },
      });
      await tx.cafeTable.update({
        where: { id: toTableId },
        data: { status: TableStatus.OCCUPIED },
      });

      await tx.auditLog.create({
        data: {
          actorUserId: actor.userId,
          action: merge ? "TABLE_MERGED" : "TABLE_TRANSFERRED",
          entityType: "CAFE_TABLE",
          entityId: toTableId,
          metadata: {
            actorRole: actor.role,
            fromTableId,
            toTableId,
            movedOrderIds: activeOrders.map((order) => order.id),
          },
        },
      });

      if (createdTargetSession) {
        await rotateTableQrConfig(tx, toTableId);
      } else {
        await ensureTableQrConfig(tx, toTableId);
      }

      return {
        fromTable: sourceTable,
        toTable: targetTable,
        movedOrderCount: activeOrders.length,
        merged: merge && targetHasActiveOrders > 0,
        targetSessionId: targetSession.id,
      };
    });

    return NextResponse.json({
      message: result.merged
        ? "Đã gộp đơn vào bàn đích."
        : "Đã chuyển bàn thành công.",
      data: result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const responseByMessage: Record<string, { message: string; status: number }> = {
      TABLE_NOT_FOUND: {
        message: "Bàn nguồn hoặc bàn đích không tồn tại.",
        status: 404,
      },
      TARGET_RESERVED: {
        message: "Không thể chuyển vào bàn đang được đặt trước.",
        status: 409,
      },
      SOURCE_EMPTY: {
        message: "Bàn nguồn không có đơn đang mở.",
        status: 409,
      },
      MERGE_REQUIRED: {
        message: "Bàn đích đang có khách. Xác nhận merge để gộp bàn.",
        status: 409,
      },
    };
    const response = responseByMessage[message];

    if (response) {
      return NextResponse.json(
        { message: response.message },
        { status: response.status },
      );
    }

    console.error(error);
    return NextResponse.json(
      { message: "Không thể chuyển hoặc gộp bàn." },
      { status: 500 },
    );
  }
}

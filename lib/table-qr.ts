import { createHash, randomBytes } from "node:crypto";
import type { Prisma } from "@prisma/client";

const TABLE_QR_TOKEN_BYTES = 32;
const TABLE_QR_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

export function createTableQrToken() {
  return randomBytes(TABLE_QR_TOKEN_BYTES).toString("base64url");
}

export function isValidTableQrToken(value: unknown): value is string {
  return typeof value === "string" && TABLE_QR_TOKEN_PATTERN.test(value);
}

export function hashTableQrToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function buildTableQrPath(token: string) {
  if (!isValidTableQrToken(token)) {
    throw new Error("Invalid table QR token.");
  }

  return `/order/table/${encodeURIComponent(token)}`;
}

export function getTableQrTokenFromPath(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  try {
    const path = new URL(value, "http://localhost").pathname;
    const token = path.split("/").filter(Boolean).pop() ?? null;
    return isValidTableQrToken(token) ? token : null;
  } catch {
    return null;
  }
}

type QrConfigClient = Pick<Prisma.TransactionClient, "cafeTable">;

async function writeTableQrConfig(
  tx: QrConfigClient,
  tableId: number,
  currentVersion: number | null,
) {
  const token = createTableQrToken();
  const tokenHash = hashTableQrToken(token);
  const qrCodeUrl = buildTableQrPath(token);

  await tx.cafeTable.update({
    where: { id: tableId },
    data: {
      qrCodeUrl,
      qrConfig: currentVersion === null
        ? {
            create: {
              tokenHash,
            },
          }
        : {
            update: {
              tokenHash,
              version: currentVersion + 1,
              active: true,
              rotatedAt: new Date(),
            },
          },
    },
  });

  return { qrCodeUrl, token };
}

export async function rotateTableQrConfig(
  tx: QrConfigClient,
  tableId: number,
) {
  const table = await tx.cafeTable.findUnique({
    where: { id: tableId },
    select: {
      id: true,
      qrConfig: {
        select: {
          version: true,
        },
      },
    },
  });

  if (!table) {
    throw new Error("Table not found while rotating QR.");
  }

  return writeTableQrConfig(tx, tableId, table.qrConfig?.version ?? null);
}

export async function ensureTableQrConfig(
  tx: QrConfigClient,
  tableId: number,
) {
  const table = await tx.cafeTable.findUnique({
    where: { id: tableId },
    select: {
      id: true,
      qrCodeUrl: true,
      qrConfig: {
        select: {
          id: true,
          tokenHash: true,
          active: true,
          version: true,
        },
      },
    },
  });

  if (!table) {
    throw new Error("Table not found while configuring QR.");
  }

  const existingToken = getTableQrTokenFromPath(table.qrCodeUrl);

  if (table.qrConfig?.active && existingToken) {
    return {
      qrCodeUrl: table.qrCodeUrl,
      token: existingToken,
    };
  }

  return writeTableQrConfig(tx, tableId, table.qrConfig?.version ?? null);
}

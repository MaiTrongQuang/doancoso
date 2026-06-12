export type KitchenOrderUrgencyLevel = "fresh" | "watch" | "late";

type KitchenSortableOrder = {
  status: string;
  createdAt: string;
};

const statusPriority: Record<string, number> = {
  PREPARING: 3,
  PENDING: 2,
  CONFIRMED: 1,
};

function getElapsedMinutes(createdAt: string, now = new Date()) {
  const createdTime = new Date(createdAt).getTime();
  const elapsedMs = now.getTime() - createdTime;

  if (!Number.isFinite(createdTime) || elapsedMs <= 0) {
    return 0;
  }

  return Math.floor(elapsedMs / 60000);
}

export function formatKitchenWaitTime(createdAt: string, now = new Date()) {
  const minutes = getElapsedMinutes(createdAt, now);

  if (minutes < 1) {
    return "vừa gửi";
  }

  if (minutes < 60) {
    return `${minutes} phút`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  return remainingMinutes > 0
    ? `${hours} giờ ${remainingMinutes} phút`
    : `${hours} giờ`;
}

export function getKitchenOrderUrgency(createdAt: string, now = new Date()) {
  const minutes = getElapsedMinutes(createdAt, now);

  if (minutes >= 15) {
    return {
      level: "late" as const,
      label: "Quá lâu",
      className: "bg-red-50 text-red-700",
      accentClassName: "bg-red-500",
      rank: 3,
    };
  }

  if (minutes >= 7) {
    return {
      level: "watch" as const,
      label: "Cần chú ý",
      className: "bg-orange-50 text-orange-700",
      accentClassName: "bg-orange-500",
      rank: 2,
    };
  }

  return {
    level: "fresh" as const,
    label: "Mới",
    className: "bg-emerald-50 text-emerald-700",
    accentClassName: "bg-emerald-500",
    rank: 1,
  };
}

export function sortKitchenOrdersByUrgency<T extends KitchenSortableOrder>(
  orders: T[],
  now = new Date(),
) {
  return [...orders].sort((left, right) => {
    const rightUrgency = getKitchenOrderUrgency(right.createdAt, now);
    const leftUrgency = getKitchenOrderUrgency(left.createdAt, now);

    if (rightUrgency.rank !== leftUrgency.rank) {
      return rightUrgency.rank - leftUrgency.rank;
    }

    const rightStatusPriority = statusPriority[right.status] ?? 0;
    const leftStatusPriority = statusPriority[left.status] ?? 0;

    if (rightStatusPriority !== leftStatusPriority) {
      return rightStatusPriority - leftStatusPriority;
    }

    return (
      new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime()
    );
  });
}

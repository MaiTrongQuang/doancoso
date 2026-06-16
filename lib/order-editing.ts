export type EditableOrderItem = {
  id: number;
  note?: string | null;
  price: number;
  quantity: number;
};

export type EditableOrderItemUpdate = {
  id: number;
  quantity: number;
  note: string | null;
};

type EditableOrderUpdatePlan =
  | {
      ok: true;
      itemUpdates: EditableOrderItemUpdate[];
      totalAmount: number;
    }
  | {
      ok: false;
      message: string;
    };

function normalizeNote(value: string | null) {
  if (typeof value !== "string") {
    return null;
  }

  const note = value.trim();
  return note.length > 0 ? note : null;
}

export function getEditableOrderUpdatePlan({
  currentItems,
  updates,
}: {
  currentItems: EditableOrderItem[];
  updates: EditableOrderItemUpdate[];
}): EditableOrderUpdatePlan {
  const currentItemById = new Map(currentItems.map((item) => [item.id, item]));
  const updateById = new Map<number, EditableOrderItemUpdate>();

  for (const update of updates) {
    if (!currentItemById.has(update.id)) {
      return {
        message: "Món trong đơn không hợp lệ.",
        ok: false,
      };
    }

    if (
      !Number.isInteger(update.quantity) ||
      update.quantity < 0 ||
      update.quantity > 99
    ) {
      return {
        message: "Số lượng món phải từ 0 đến 99.",
        ok: false,
      };
    }

    updateById.set(update.id, {
      id: update.id,
      note: normalizeNote(update.note),
      quantity: update.quantity,
    });
  }

  const itemUpdates = currentItems.map((item) => {
    return (
      updateById.get(item.id) ?? {
        id: item.id,
        note: normalizeNote(item.note ?? null),
        quantity: item.quantity,
      }
    );
  });
  const totalAmount = itemUpdates.reduce((total, update) => {
    const currentItem = currentItemById.get(update.id);
    return total + (currentItem?.price ?? 0) * update.quantity;
  }, 0);

  if (itemUpdates.every((update) => update.quantity === 0)) {
    return {
      message: "Đơn phải còn ít nhất một món.",
      ok: false,
    };
  }

  return {
    itemUpdates,
    ok: true,
    totalAmount,
  };
}

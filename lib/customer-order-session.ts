export type CustomerOrderSessionResolution =
  | { kind: "CREATE" }
  | { kind: "USE"; sessionId: number }
  | { kind: "CONFLICT" };

export function resolveCustomerOrderSession(
  requestedSessionId: number | null,
  activeSessionId: number | null,
): CustomerOrderSessionResolution {
  if (activeSessionId === null) {
    return requestedSessionId === null ? { kind: "CREATE" } : { kind: "CONFLICT" };
  }

  if (requestedSessionId === null || requestedSessionId === activeSessionId) {
    return { kind: "USE", sessionId: activeSessionId };
  }

  return { kind: "CONFLICT" };
}

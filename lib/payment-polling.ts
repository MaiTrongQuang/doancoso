const FAST_POLLING_WINDOW_MS = 15_000;
const FAST_POLLING_DELAY_MS = 1_000;
const BACKOFF_POLLING_DELAY_MS = 3_000;

export function getPaymentPollingDelay(elapsedMs: number) {
  return elapsedMs < FAST_POLLING_WINDOW_MS
    ? FAST_POLLING_DELAY_MS
    : BACKOFF_POLLING_DELAY_MS;
}

import PocketBase, { ClientResponseError } from 'pocketbase';

// Absent in the public-calendar-only build (no backend configured); the
// client still constructs fine against '' since nothing calls it unless a
// person opens one of the auth-gated views.
const url = import.meta.env.VITE_POCKETBASE_URL ?? '';

export const pb = new PocketBase(url);

export type { RecordModel } from 'pocketbase';

// The SDK auto-cancels a request when a newer one to the same
// collection+method is issued before it resolves (e.g. React re-rendering a
// data hook twice in a row). The newer request's result is what matters, so
// callers should ignore this rather than surface it as a real failure.
export function isAbortError(err: unknown): boolean {
  return err instanceof ClientResponseError && err.isAbort;
}

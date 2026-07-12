/** Extract a human-readable message from any thrown value. */
export function getErrorMessage(err: unknown, fallback = 'Something went wrong'): string {
  if (err instanceof Error) return err.message
  if (err && typeof err === 'object') {
    const e = err as Record<string, unknown>
    // PostgrestError shape: { message, code, details, hint }
    if (typeof e.message === 'string' && e.message) return e.message
    if (typeof e.details === 'string' && e.details) return e.details
  }
  if (typeof err === 'string' && err) return err
  return fallback
}

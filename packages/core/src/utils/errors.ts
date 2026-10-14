/**
 * Render an unknown cause as message text: an Error's message, else its
 * string form. Kept free of `effect` so the `plain` entry can reuse it alongside the
 * full API.
 */
export function describeCause(cause: unknown): string {
  return cause instanceof Error ? cause.message : String(cause);
}

/**
 * Render an unknown cause as the message text the pre-Effect engine used.
 *
 * Kept free of `effect` so the `plain` entry can reuse it alongside the
 * full API.
 */
export function describeCause(cause: unknown): string {
  return cause instanceof Error ? cause.message : String(cause);
}

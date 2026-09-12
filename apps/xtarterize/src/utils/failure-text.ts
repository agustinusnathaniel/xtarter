/**
 * Text the CLI renders for a failed program. Shared by the runtime edge and
 * the error mappers that wrap unexpected rejections so a raw failure and its
 * typed replacement render byte-identically.
 */
export function formatFailureText(value: unknown): string {
  if (value instanceof Error) {
    return value.message || value.name;
  }
  return String(value);
}

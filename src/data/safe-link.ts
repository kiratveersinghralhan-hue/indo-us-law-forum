export function safeLink(value: unknown): string | undefined {
  try {
    if (typeof value !== 'string') return;
    const url = new URL(value);
    if (
      !['https:', 'http:'].includes(url.protocol) ||
      url.username ||
      url.password
    )
      return;
    return value;
  } catch {
    return;
  }
}

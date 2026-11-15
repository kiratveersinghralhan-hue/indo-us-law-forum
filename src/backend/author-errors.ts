// Catalog failures are shown in staff UI only. Never echo raw server responses.
export function authorError(
  error: unknown,
  action: 'load' | 'save' | 'delete',
) {
  const source = (error ?? {}) as {
    status?: number;
    code?: string;
    message?: string;
  };
  const message = String(source.message ?? '');
  const status = Number(source.status) || 0;
  const code = /^(42501|23503|23514|23505)$/.test(source.code ?? '')
    ? source.code
    : 'unclassified';
  console.warn('[author-catalog]', {
    action,
    status: status >= 100 && status <= 599 ? status : 0,
    code,
  });
  if (
    status === 401 ||
    /jwt.*expired|refresh.token|auth session missing/i.test(message)
  )
    return 'Your session could not be verified. Keep this tab open, sign in again in another tab, then retry.';
  if (
    status === 403 ||
    code === '42501' ||
    /row.level security|permission denied|access denied|not authorized/i.test(
      message,
    )
  )
    return 'Active staff access is required to manage or approve authors. Ask an administrator to check your access, then retry.';
  if (action === 'delete' && (code === '23503' || /foreign key/i.test(message)))
    return 'This author is referenced by an article. Keep the author record and review its article associations first.';
  if (/Unpublish referencing articles before hiding this author/i.test(message))
    return 'This author has published articles. Unpublish those articles before removing author approval.';
  return action === 'load'
    ? 'The author list could not be loaded. Check your connection and retry; your article edits and cover are unchanged.'
    : action === 'delete'
      ? 'Author deletion could not be confirmed. Refresh the list before retrying.'
      : 'Author saving could not be confirmed. Check the name (1–120 characters), biography (up to 2000 characters) and your connection, then retry. Your entered details are still here.';
}

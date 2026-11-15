import { DemoValidationError } from '../admin/validation';

export class EditorialActionError extends Error {
  constructor(
    message: string,
    public field = 'upload',
  ) {
    super(message);
  }
}

// Never retain response bodies, URLs, headers, user content or arbitrary error text.
export function actionError(
  error: unknown,
  stage:
    | 'save'
    | 'session'
    | 'permission'
    | 'storage'
    | 'asset-reference'
    | 'preview',
) {
  if (
    error instanceof DemoValidationError ||
    error instanceof EditorialActionError
  )
    return error;
  const source = (error ?? {}) as {
    status?: number;
    statusCode?: string;
    code?: string;
    message?: string;
  };
  const status = Number(source.statusCode ?? source.status) || 0;
  const code = /^(23505|23514|23503|42501|PGRST[0-9]{3})$/.test(
    source.code ?? '',
  )
    ? source.code
    : 'unclassified';
  const message = String(source.message ?? '');
  console.warn('[editorial-action]', {
    stage,
    status: status >= 100 && status <= 599 ? status : 0,
    code,
  });
  const field = stage === 'save' ? 'save' : 'upload';
  if (
    status === 401 ||
    /jwt.*expired|refresh.token|auth session missing/i.test(message) ||
    stage === 'session'
  )
    return new EditorialActionError(
      'Your session could not be verified. Keep this page open, sign in again in another tab, then retry.',
      field,
    );
  if (
    status === 403 ||
    code === '42501' ||
    /row.level security|access denied|not authorized/i.test(message) ||
    (stage === 'permission' && !error)
  )
    return new EditorialActionError(
      'Your account does not have active editorial access. Ask an administrator to verify your staff access, then retry.',
      field,
    );
  if (stage === 'save' && code === '23505')
    return new DemoValidationError({
      slug: 'This slug is already in use. Choose another slug and save again.',
    });
  if (stage === 'save' && /Publish an approved category first/i.test(message))
    return new DemoValidationError({
      categoryId:
        'This category is not approved for publication. Choose a published category or save a draft.',
    });
  if (stage === 'save' && /Publish an approved author first/i.test(message))
    return new DemoValidationError({
      authorId:
        'This author is not approved for publication. Choose an approved author or save a draft.',
    });
  if (stage === 'permission')
    return new EditorialActionError(
      'Staff access could not be checked. Check your connection and retry; your selected file is still here.',
      field,
    );
  if (stage === 'save' && /record changed|access was revoked/i.test(message))
    return new EditorialActionError(
      'This record changed or access was revoked. Keep your edits, open the saved record in another tab and reconcile before retrying.',
      'save',
    );
  if (status === 413)
    return new EditorialActionError(
      'The image exceeds the storage size limit. Choose a PNG, JPEG or WebP up to 3 MB.',
      field,
    );
  if (status === 415)
    return new EditorialActionError(
      'This image format is unsupported. Choose a PNG, JPEG or WebP and retry.',
      field,
    );
  if (
    stage === 'storage' &&
    (status === 404 || /bucket.*not found/i.test(message))
  )
    return new EditorialActionError(
      'The editorial storage bucket is unavailable. Ask the administrator to check the configured project and bucket, then retry.',
      field,
    );
  if (stage === 'asset-reference')
    return new EditorialActionError(
      'The file was uploaded, but its cover reference could not be confirmed. Keep the selected file and retry to finish linking it.',
      field,
    );
  if (stage === 'preview')
    return new EditorialActionError(
      'The file and cover reference were saved, but the private preview is unavailable. Keep the file selected and retry; it will not upload another copy.',
      field,
    );
  if (stage === 'save' && code === '23514')
    return new EditorialActionError(
      'The article was rejected by a content rule. Check the author, cover and structured content; your edits are still here.',
      'save',
    );
  return new EditorialActionError(
    stage === 'save'
      ? 'The article save could not be confirmed. Check your connection and retry; your edits are still here.'
      : 'The image upload could not be confirmed. Check your connection and retry with the selected file.',
    field,
  );
}

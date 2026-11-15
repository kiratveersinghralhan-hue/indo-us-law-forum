import { EditorialActionError } from './action-errors';
export async function validateUpload(
  file: Pick<File, 'size' | 'type' | 'arrayBuffer'>,
  purpose: 'image' | 'document',
) {
  const limit = purpose === 'image' ? 3 * 1024 * 1024 : 10 * 1024 * 1024;
  if (file.size <= 0 || file.size > limit)
    throw new EditorialActionError(
      `This file is ${file.size} bytes; the limit is ${limit} bytes (${limit / 1024 / 1024} MB). Choose a non-empty smaller file.`,
    );
  const supported =
    purpose === 'image'
      ? ['image/png', 'image/jpeg', 'image/webp']
      : ['application/pdf'];
  if (!supported.includes(file.type))
    throw new EditorialActionError(
      purpose === 'image'
        ? 'This image format is unsupported. Choose a PNG, JPEG or WebP up to 3 MB.'
        : 'This document format is unsupported. Choose a PDF up to 10 MB.',
    );
  let bytes: Uint8Array;
  try {
    bytes = new Uint8Array(await file.arrayBuffer());
  } catch {
    throw new EditorialActionError(
      'The selected file could not be read. Choose it again and retry.',
    );
  }
  const text = (start: number, count: number) =>
    new TextDecoder().decode(bytes.slice(start, start + count));
  const valid =
    purpose === 'document'
      ? file.type === 'application/pdf' && text(0, 5) === '%PDF-'
      : (file.type === 'image/png' &&
          bytes[0] === 137 &&
          text(1, 3) === 'PNG') ||
        (file.type === 'image/jpeg' &&
          bytes[0] === 255 &&
          bytes[1] === 216 &&
          bytes[2] === 255) ||
        (file.type === 'image/webp' &&
          text(0, 4) === 'RIFF' &&
          text(8, 4) === 'WEBP');
  if (!valid)
    throw new EditorialActionError(
      purpose === 'image'
        ? 'The file contents do not match its image format. Export a PNG, JPEG or WebP and select the new file.'
        : 'The file contents do not match a PDF. Export a PDF and select the new file.',
    );
}

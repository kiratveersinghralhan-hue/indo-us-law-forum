import { blockErrors, DemoValidationError } from '../admin/validation';
import type { AdminArticle, AdminCase } from '../admin/types';

// Mirrors the existing DB limits; drafts deliberately do not require an author/cover.
export function validateBackendContent(record: AdminArticle | AdminCase) {
  const fields = blockErrors(record.body);
  for (const [key, label, limit] of [
    ['title', 'Title', 180],
    ['summary', 'Excerpt', 1200],
  ] as const) {
    const value = record[key];
    if (typeof value !== 'string' || !value.trim())
      fields[key] = `${label} is empty. Add ${label.toLowerCase()} text.`;
    else if (Array.from(value.trim()).length > limit)
      fields[key] =
        `${label} has ${Array.from(value.trim()).length} characters; the limit is ${limit}. Shorten it.`;
  }
  if (
    !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(record.slug ?? '') ||
    record.slug.length > 160
  )
    fields.slug = `Slug must use lowercase letters, numbers and single hyphens (maximum 160 characters; current length ${record.slug?.length ?? 0}).`;
  if (!record.categoryId)
    fields.categoryId = 'Choose a category before saving.';
  if (
    !Number.isInteger(record.order) ||
    record.order < 0 ||
    record.order > 1000
  )
    fields.order = 'Display order must be a whole number between 0 and 1000.';
  if (
    'sampleAuthor' in record &&
    record.status === 'published' &&
    !record.authorId
  )
    fields.authorId =
      'Choose an approved author before publishing. You can save a draft without one.';
  if (
    'sampleAuthor' in record &&
    record.status === 'published' &&
    !record.coverAssetId
  )
    fields.coverAssetId =
      'Upload an editorial cover before publishing. Then save the article to associate it.';
  if (Object.keys(fields).length) throw new DemoValidationError(fields);
}

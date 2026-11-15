import type {
  AdminArticle,
  AdminCase,
  AdminSettings,
  AdminSnapshot,
  AdminTeam,
} from './types';
import type { ContentBlock } from '../data/types';
import type { SocialLink } from '../data/site-settings';
import { homepageSections } from '../data/site-settings';
import { researchCategories } from '../config/research-categories';
import { editorialMedia } from '../config/media';

export class DemoValidationError extends Error {
  fields: Record<string, string>;
  constructor(fields: Record<string, string>) {
    super(Object.values(fields)[0]);
    this.fields = fields;
  }
}
function fail(field: string, message: string): never {
  throw new DemoValidationError({ [field]: message });
}
function text(
  value: unknown,
  field: string,
  label: string,
  required = true,
  max = 6000,
) {
  if (
    typeof value !== 'string' ||
    value.length > max ||
    (required && !value.trim())
  )
    fail(
      field,
      `${label} must ${required ? 'contain text and ' : ''}be no more than ${max} characters.`,
    );
}
function fictional(value: unknown) {
  if (value !== true)
    fail(
      'fictional',
      'Confirm that this is fictional demo content, without real personal information.',
    );
}
function order(value: unknown) {
  if (!Number.isSafeInteger(value) || Number(value) < 0 || Number(value) > 1000)
    fail('order', 'Display order must be a whole number between 0 and 1000.');
}
export function validateLinks(links: SocialLink[]) {
  if (!Array.isArray(links) || links.length > 12)
    fail('links', 'Use at most 12 sample links.');
  links.forEach((link) => {
    text(link.label, 'links', 'Link label', true, 80);
    text(link.url, 'links', 'Sample URL', true, 500);
    try {
      const url = new URL(link.url);
      if (
        !['https:', 'http:'].includes(url.protocol) ||
        url.username ||
        url.password
      )
        throw Error();
    } catch {
      fail(
        'links',
        'Sample links must be complete HTTP/HTTPS URLs without credentials.',
      );
    }
  });
}
export function blockErrors(blocks: ContentBlock[]): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!Array.isArray(blocks) || !blocks.length || blocks.length > 80)
    return {
      body: `Structured content has ${Array.isArray(blocks) ? blocks.length : 0} blocks. Add 1–80 supported content blocks.`,
    };
  const check = (value: unknown, key: string, label: string, noun: string) => {
    if (typeof value !== 'string' || !value.trim())
      errors[key] = `${label} is empty. Add text or remove this ${noun}.`;
    else if (Array.from(value).length > 6000)
      errors[key] =
        `${label} has ${Array.from(value).length} characters; the limit is 6000. Shorten or split this ${noun}.`;
  };
  blocks.forEach((block, index) => {
    const key = `body.${index}`,
      label = `Content block ${index + 1}`;
    if (
      !block ||
      !['paragraph', 'heading', 'note', 'list'].includes(block.type)
    ) {
      errors[key] =
        `${label} is unsupported. Use a paragraph, heading, note or bullet list.`;
      return;
    }
    if (block.type === 'list') {
      if (
        !Array.isArray(block.items) ||
        !block.items.length ||
        block.items.length > 40
      ) {
        errors[key] =
          `${label} needs 1–40 bullet items; it has ${Array.isArray(block.items) ? block.items.length : 0}.`;
        return;
      }
      block.items.forEach((item, bullet) =>
        check(
          item,
          `${key}.items.${bullet}`,
          `${label}, bullet ${bullet + 1}`,
          'bullet',
        ),
      );
    } else check(block.text, key, label, 'block');
  });
  return errors;
}
export function validateBlocks(blocks: ContentBlock[]) {
  const errors = blockErrors(blocks);
  if (Object.keys(errors).length) throw new DemoValidationError(errors);
}
function validateBase(
  record: AdminArticle | AdminCase,
  snapshot: AdminSnapshot,
  kind: 'articles' | 'cases',
) {
  fictional(record.fictional);
  order(record.order);
  text(record.id, 'id', 'Record identifier', false, 180);
  text(record.title, 'title', 'Title', true, 180);
  text(record.summary, 'summary', 'Excerpt', true, 1200);
  if (
    typeof record.slug !== 'string' ||
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(record.slug) ||
    record.slug.length > 160
  )
    fail(
      'slug',
      'Use a lowercase slug with letters, numbers and single hyphens.',
    );
  if (
    snapshot[kind].some(
      (item) => item.slug === record.slug && item.id !== record.id,
    )
  )
    fail(
      'slug',
      'This slug is already used by another demo record, including drafts.',
    );
  if (!snapshot.settings.categories.some((c) => c.id === record.categoryId))
    fail('categoryId', 'Choose an available sample category.');
  if (!['draft', 'published'].includes(record.status))
    fail('status', 'Choose draft or published.');
  validateBlocks(record.body);
}
export function validateArticle(record: AdminArticle, snapshot: AdminSnapshot) {
  validateBase(record, snapshot, 'articles');
  if (
    record.coverUrl !== undefined &&
    (!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(
      record.coverUrl,
    ) ||
      record.coverUrl.length > 1_050_000)
  )
    fail(
      'coverUrl',
      'Local covers must be supported embedded images up to 768 KB.',
    );
  if (record.coverAlt !== undefined)
    text(record.coverAlt, 'coverAlt', 'Cover description', false, 240);
  text(record.sampleAuthor, 'sampleAuthor', 'Sample author', true, 120);
  if (!Object.hasOwn(editorialMedia, record.artwork))
    fail('artwork', 'Choose bundled local artwork.');
  if (typeof record.featured !== 'boolean')
    fail('featured', 'Featured selection is invalid.');
  if (
    !Number.isFinite(record.readingMinutes) ||
    record.readingMinutes < 1 ||
    record.readingMinutes > 100
  )
    fail('readingMinutes', 'Reading duration is invalid.');
  text(
    record.publicationLabel,
    'publicationLabel',
    'Sample publication label',
    true,
    160,
  );
  if (record.submissionId !== undefined)
    text(record.submissionId, 'submissionId', 'Source submission', true, 180);
}
export function validateCase(record: AdminCase, snapshot: AdminSnapshot) {
  validateBase(record, snapshot, 'cases');
  if (typeof record.featured !== 'boolean')
    fail('featured', 'Featured selection is invalid.');
  text(record.reference, 'reference', 'Sample reference', true, 80);
  text(record.setting, 'setting', 'Provisional setting', true, 160);
  text(record.dateLabel, 'dateLabel', 'Provisional date', true, 160);
  if (!['Case study', 'Research note'].includes(record.kind))
    fail('kind', 'Choose a supported record type.');
  if (!Array.isArray(record.tags) || record.tags.length > 20)
    fail('tags', 'Use up to 20 sample tags.');
  record.tags.forEach((tag) => text(tag, 'tags', 'Tag', true, 60));
  if (
    !Array.isArray(record.supportingDocuments) ||
    record.supportingDocuments.length > 20
  )
    fail('supportingDocuments', 'Use up to 20 document placeholders.');
  record.supportingDocuments.forEach((label) =>
    text(label, 'supportingDocuments', 'Document placeholder', true, 160),
  );
  text(record.sourceNote, 'sourceNote', 'Source limitation note', true, 1200);
}
export function validateTeam(record: AdminTeam) {
  fictional(record.fictional);
  order(record.order);
  text(record.id, 'id', 'Member identifier', false, 180);
  text(record.label, 'label', 'Sample name', true, 120);
  text(record.role, 'role', 'Sample role', true, 120);
  text(record.description, 'description', 'Sample biography', true, 2000);
  if (record.artwork !== 'avatar')
    fail(
      'artwork',
      'Use the neutral bundled avatar for saved sample profiles.',
    );
  validateLinks(record.links ?? []);
}
export function validateSettings(
  settings: AdminSettings,
  snapshot: AdminSnapshot,
  allowLegacyStore = false,
) {
  fictional(settings.fictional);
  text(settings.hero.eyebrow, 'hero', 'Hero eyebrow', true, 100);
  if (!Array.isArray(settings.hero.lines) || settings.hero.lines.length !== 3)
    fail('hero', 'Keep the existing three-line headline.');
  settings.hero.lines.forEach((line) =>
    text(line, 'hero', 'Headline line', true, 100),
  );
  text(settings.hero.introduction, 'hero', 'Hero introduction', true, 600);
  text(settings.contact.email, 'contact', 'Sample contact email', false, 160);
  if (
    settings.contact.email &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(settings.contact.email)
  )
    fail('contact', 'Enter a valid fictional email or leave it empty.');
  text(
    settings.contact.address,
    'contact',
    'Sample contact details',
    false,
    500,
  );
  validateLinks(settings.socialLinks);
  if (
    !Array.isArray(settings.categories) ||
    ![3, 7].includes(settings.categories.length) ||
    (!allowLegacyStore && settings.categories.length !== 7) ||
    (settings.categories.length === 3 &&
      settings.categories.some(
        (c, i) => c.id !== ['institutions', 'communities', 'environment'][i],
      )) ||
    new Set(settings.categories.map((c) => c.id)).size !==
      settings.categories.length ||
    settings.categories.some((c) => {
      const confirmed = researchCategories.find((r) => r.id === c.id);
      return confirmed
        ? confirmed.label !== c.label
        : !['institutions', 'communities', 'environment'].includes(c.id);
    }) ||
    (settings.categories.length === 7 &&
      researchCategories.some(
        (c) => !settings.categories.some((r) => r.id === c.id),
      ))
  )
    fail(
      'categories',
      'Retain the four exact research categories and the unmapped legacy identifiers.',
    );
  settings.categories.forEach((c) => {
    text(c.label, 'categories', 'Focus label', true, 80);
    text(c.description, 'categories', 'Focus description', true, 400);
  });
  if (
    !Array.isArray(settings.sections) ||
    settings.sections.length !== homepageSections.length ||
    new Set(settings.sections.map((s) => s.id)).size !==
      homepageSections.length ||
    settings.sections.some(
      (s) =>
        !homepageSections.some((h) => h.id === s.id) ||
        typeof s.visible !== 'boolean',
    )
  )
    fail(
      'sections',
      'Keep each existing optional homepage section exactly once.',
    );
  for (const [field, records] of [
    ['featuredArticleIds', snapshot.articles],
    ['featuredCaseIds', snapshot.cases],
  ] as const) {
    const ids = settings[field];
    if (
      !allowLegacyStore &&
      field === 'featuredArticleIds' &&
      ids.some(
        (id) =>
          !snapshot.articles.some(
            (a) => a.id === id && a.status === 'published',
          ),
      )
    )
      fail(
        field,
        'Only published articles can be featured. Remove unavailable selections and save again.',
      );
    if (
      !Array.isArray(ids) ||
      new Set(ids).size !== ids.length ||
      ids.some((id) => !records.some((r) => r.id === id))
    )
      fail(
        field,
        'Featured selections must refer to existing demo records without duplicates.',
      );
  }
}
export function validateSnapshot(raw: unknown): asserts raw is AdminSnapshot {
  if (!raw || typeof raw !== 'object') throw Error('Invalid demo store.');
  const snapshot = raw as AdminSnapshot;
  if (
    snapshot.version !== 1 ||
    !['articles', 'cases', 'team', 'submissions', 'activity'].every((key) =>
      Array.isArray(snapshot[key as keyof AdminSnapshot]),
    ) ||
    !snapshot.settings
  )
    throw Error('Invalid demo store version or structure.');
  validateSettings(snapshot.settings, snapshot, true);
  for (const kind of ['articles', 'cases', 'team'] as const) {
    if (
      snapshot[kind].length > 200 ||
      new Set(snapshot[kind].map((r) => r.id)).size !== snapshot[kind].length ||
      snapshot[kind].some((r) => !r.id)
    )
      throw Error('Invalid demo record identifiers.');
  }
  snapshot.articles.forEach((r) => validateArticle(r, snapshot));
  snapshot.cases.forEach((r) => validateCase(r, snapshot));
  snapshot.team.forEach(validateTeam);
  if (
    new Set(snapshot.submissions.map((s) => s.id)).size !==
    snapshot.submissions.length
  )
    throw Error('Invalid submissions.');
  snapshot.submissions.forEach((s) => {
    fictional(s.fictional);
    text(s.id, 'id', 'Submission identifier', true, 180);
    text(s.title, 'title', 'Submission title', true, 180);
    text(s.excerpt, 'excerpt', 'Submission excerpt', true, 1200);
    text(s.author, 'author', 'Sample submitter', true, 120);
    validateBlocks(s.body);
    if (
      !['pending', 'approved', 'rejected'].includes(s.status) ||
      !snapshot.settings.categories.some((c) => c.id === s.categoryId)
    )
      throw Error('Invalid submission state.');
    if (s.convertedArticleId !== undefined)
      text(s.convertedArticleId, 'id', 'Conversion identifier', true, 180);
    if (s.convertedArticleId && s.status !== 'approved')
      throw Error('Converted submissions must be approved.');
  });
  snapshot.articles.forEach((a) => {
    if (
      a.submissionId &&
      !snapshot.submissions.some(
        (s) =>
          s.id === a.submissionId &&
          s.convertedArticleId === a.id &&
          s.status === 'approved',
      )
    )
      throw Error('Invalid submission conversion link.');
  });
  snapshot.activity.forEach((a) => {
    text(a.id, 'activity', 'Activity identifier', true, 180);
    text(a.message, 'activity', 'Activity', true, 400);
    if (!Number.isFinite(Date.parse(a.at)))
      throw Error('Invalid activity date.');
  });
}

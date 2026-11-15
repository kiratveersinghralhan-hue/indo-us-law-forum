import { expect, it, vi } from 'vitest';
import { authorError } from '../src/backend/author-errors';
import {
  rememberEditorDraft,
  resumedEditorDraft,
  stageEditorDrafts,
} from '../src/admin/dev-editor-drafts';
import type { EditorDraft } from '../src/admin/dev-editor-drafts';

it('author errors identify access, session and referenced records without exposing raw server data', () => {
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
  expect(
    authorError(
      { status: 403, code: '42501', message: 'secret=DO-NOT-DISPLAY' },
      'save',
    ),
  ).toContain('Active staff access');
  expect(
    authorError(new Error('JWT expired secret=DO-NOT-DISPLAY'), 'load'),
  ).toContain('session');
  expect(
    authorError(
      new Error('new row violates row-level security secret=DO-NOT-DISPLAY'),
      'save',
    ),
  ).toContain('Active staff access');
  expect(
    authorError({ code: '23503', message: 'secret=DO-NOT-DISPLAY' }, 'delete'),
  ).toContain('referenced');
  expect(
    authorError(
      new Error('Unpublish referencing articles before hiding this author'),
      'save',
    ),
  ).toContain('Unpublish');
  expect(authorError(new Error('secret=DO-NOT-DISPLAY'), 'load')).toContain(
    'could not be loaded',
  );
  expect(JSON.stringify(warn.mock.calls)).not.toContain('DO-NOT-DISPLAY');
  warn.mockRestore();
});

it('development remount recovery preserves content/cover until committed, including repeated initializers', () => {
  const state = {
    record: { id: 'draft', title: 'Unsaved', coverAssetId: 'existing-cover' },
    baseline: 'original',
    tagsText: 'tags',
    documentText: 'docs',
  } as EditorDraft;
  const cleanup = rememberEditorDraft('hot-check', state);
  stageEditorDrafts();
  cleanup();
  stageEditorDrafts(); // A second update can arrive before the component remounts.
  expect(resumedEditorDraft('hot-check')).toBe(state);
  expect(resumedEditorDraft('hot-check')).toBe(state);
  const nextCleanup = rememberEditorDraft('hot-check', state);
  expect(resumedEditorDraft('hot-check')).toBeUndefined();
  nextCleanup();
  stageEditorDrafts();
  expect(resumedEditorDraft('hot-check')).toBeUndefined();
});

it('normal navigation does not restore discarded editor data', () => {
  const cleanup = rememberEditorDraft('discard-check', {} as EditorDraft);
  cleanup();
  stageEditorDrafts();
  expect(resumedEditorDraft('discard-check')).toBeUndefined();
});

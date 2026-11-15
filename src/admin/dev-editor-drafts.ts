import type { AdminArticle, AdminCase, AdminTeam } from './types';

export type EditorDraft = {
  record: AdminArticle | AdminCase | AdminTeam;
  baseline: string;
  tagsText: string;
  documentText: string;
};
// Used only by Vite hot refresh. No browser storage or backend writes.
const active = new Map<string, EditorDraft>();
const pending = new Map<string, EditorDraft>();
export function stageEditorDrafts() {
  for (const [key, draft] of active) pending.set(key, draft);
}
export function resumedEditorDraft(key: string) {
  return pending.get(key);
}
export function rememberEditorDraft(key: string, draft: EditorDraft) {
  active.set(key, draft);
  pending.delete(key);
  return () => {
    if (active.get(key) === draft) active.delete(key);
  };
}

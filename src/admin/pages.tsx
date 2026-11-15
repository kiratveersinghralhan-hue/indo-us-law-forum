import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  lazy,
  Suspense,
} from 'react';
import { Link, NavLink, Outlet, useParams } from 'react-router-dom';
import {
  Button,
  ButtonLink,
  EmptyState,
  Field,
  Input,
  LoadingState,
  Select,
} from '../components/ui';
import { EditorialArtwork, StructuredContent } from '../components/content';
import { adminPath } from '../config/navigation';
import { brand } from '../config/brand';
import { setPageMetadata } from '../config/seo';
import { categoryDisplay } from '../config/research-categories';
import { useUnsavedChanges } from './use-unsaved-changes';
import { editorialMedia } from '../config/media';
import { articleCover, heroCoverLimit } from '../data/article-presentation';
import type { ArtworkId } from '../config/media';
import { useDemoEnvironment } from './context';
import type {
  AdminArticle,
  AdminCase,
  AdminSettings,
  AdminSnapshot,
  AdminTeam,
  RecordKind,
} from './types';
import { DemoValidationError, blockErrors } from './validation';
import { actionError } from '../backend/action-errors';
import { ErrorToast } from './error-toast';
import { authorError } from '../backend/author-errors';
import {
  rememberEditorDraft,
  resumedEditorDraft,
  stageEditorDrafts,
} from './dev-editor-drafts';
import type { EditorDraft } from './dev-editor-drafts';
import {
  ConfirmDialog,
  FictionalConfirmation,
  LinkEditor,
  LocalImagePreview,
  StructuredEditor,
  TextField,
} from './ui';

import {
  AssetUpload,
  CaseDocuments,
  SubmissionAttachments,
} from '../backend/admin-tools';
const RichEditor = lazy(() =>
  import('../backend/rich-editor').then((m) => ({ default: m.RichEditor })),
);

const SnapshotContext = createContext<AdminSnapshot | null>(null);
if (import.meta.hot) {
  import.meta.hot.dispose(stageEditorDrafts);
}
function useSnapshot() {
  const snapshot = useContext(SnapshotContext);
  if (!snapshot) throw Error('Admin demo records have not loaded.');
  return snapshot;
}
const message = (error: unknown) =>
  error instanceof Error
    ? error.message
    : 'The local demo action failed. Try again.';
const ordered = <T extends { order: number }>(records: T[]) =>
  [...records].sort((a, b) => a.order - b.order);

export function AdminLayout() {
  useEffect(() => {
    setPageMetadata('Editorial workspace');
  }, []);
  const env = useDemoEnvironment();
  const revision = useSyncExternalStore(
    env.subscribe,
    env.getRevision,
    env.getRevision,
  );
  const [snapshot, setSnapshot] = useState<AdminSnapshot | null>(null);
  const [error, setError] = useState('');
  const [reset, setReset] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [resetEpoch, setResetEpoch] = useState(0);
  useEffect(() => {
    let cancelled = false;
    env.admin.readSnapshot().then(
      (data) => {
        if (!cancelled) {
          setSnapshot(data);
          setError('');
        }
      },
      (e) => {
        if (!cancelled) {
          // A transient background read must not unmount a dirty editor.
          // Explicit loss of staff access still closes the workspace.
          if (
            env.backend &&
            message(e) === 'Authorized staff access is required.'
          )
            setSnapshot(null);
          setError(
            env.backend
              ? message(e) === 'Authorized staff access is required.'
                ? 'Active staff access is required. Ask an administrator to verify your access, then sign in again.'
                : 'Backend records could not be refreshed. Your open edits are retained. Check your connection and retry.'
              : message(e),
          );
        }
      },
    );
    return () => {
      cancelled = true;
    };
  }, [env, revision]);
  async function resetData() {
    try {
      await env.admin.resetDemo();
      setSnapshot(await env.admin.readSnapshot());
      setResetEpoch((value) => value + 1);
      setFeedback('Demo data reset. Motion preferences were retained.');
      setReset(false);
    } catch (e) {
      setError(message(e));
      setReset(false);
    }
  }
  return (
    <div className="admin-shell container bottom-space">
      <header className="admin-header">
        <p className="eyebrow">
          {brand.name} /{' '}
          {env.backend ? 'Staff workspace' : 'Browser-local workspace'}
        </p>
        <h1>{env.backend ? 'Editorial administration' : 'Admin prototype'}</h1>
        <p className="admin-notice">
          {env.backend
            ? 'Dedicated backend mode — access is authorized by database policies.'
            : 'Admin prototype — local demo data; no authentication or live website changes.'}
        </p>
        <p>
          {env.backend
            ? 'Use approved content only. Publishing changes the configured backend. Analytics remain disconnected.'
            : 'Use fictional content only. No credentials or real personal information. “Publish” changes this browser’s demo pages only.'}
        </p>
      </header>
      <div className="admin-toolbar">
        <nav aria-label="Admin">
          {[
            ['', 'Dashboard'],
            ['articles', 'Articles'],
            ['submissions', 'Submissions'],
            ['cases', 'Cases'],
            ['team', 'Team'],
            ['settings', 'Homepage & content'],
            ...(env.backend
              ? [
                  ['categories', 'Categories'],
                  ['authors', 'Authors'],
                ]
              : []),
          ].map(([section, label]) => (
            <NavLink key={section} to={adminPath(section)} end={section === ''}>
              {label}
            </NavLink>
          ))}
        </nav>
        {env.backend ? (
          <Button
            variant="secondary"
            onClick={() => {
              if (window.confirm('Sign out and discard any unsaved edits?'))
                void env.backend!.signOut().catch((e) => setError(message(e)));
            }}
          >
            Sign out
          </Button>
        ) : (
          <Button variant="secondary" onClick={() => setReset(true)}>
            Reset demo data
          </Button>
        )}
      </div>
      {feedback && (
        <p role="status" className="admin-feedback">
          {feedback}
        </p>
      )}
      {error && snapshot && (
        <>
          <Button variant="secondary" onClick={() => env.refresh()}>
            Retry records
          </Button>
          <ErrorToast message={error} onDismiss={() => setError('')} />
        </>
      )}
      {error && !snapshot ? (
        <div className="state-panel" role="alert">
          <h2>
            {env.backend
              ? 'Backend records could not be loaded.'
              : 'Local demo data could not be loaded.'}
          </h2>
          <p>{error}</p>
          <Button onClick={() => env.refresh()}>
            {env.backend ? 'Retry records' : 'Retry local data'}
          </Button>
        </div>
      ) : snapshot ? (
        <SnapshotContext.Provider value={snapshot}>
          <div key={resetEpoch} className="admin-content">
            <Outlet />
          </div>
        </SnapshotContext.Provider>
      ) : (
        <LoadingState />
      )}
      {reset && (
        <ConfirmDialog
          title="Reset demo data?"
          confirmLabel="Reset all demo records"
          onCancel={() => setReset(false)}
          onConfirm={() => void resetData()}
        >
          <p>
            This replaces all saved fictional articles, cases, team members,
            submissions and content settings with the original samples. It
            affects this browser’s demo store only. Unsaved edits in this admin
            view are discarded too.
          </p>
        </ConfirmDialog>
      )}
    </div>
  );
}

export function AdminDashboard() {
  const data = useSnapshot();
  const env = useDemoEnvironment();
  const stats = [
    [
      'Draft articles',
      data.counts?.drafts ??
        data.articles.filter((a) => a.status === 'draft').length,
    ],
    [
      'Published articles',
      data.counts?.published ??
        data.articles.filter((a) => a.status === 'published').length,
    ],
    [
      'Pending submissions',
      data.counts?.pending ??
        data.submissions.filter((s) => s.status === 'pending').length,
    ],
    ['Cases', data.counts?.cases ?? data.cases.length],
  ];
  return (
    <>
      <h2>Dashboard</h2>
      <p>
        Counts come from{' '}
        {env.backend
          ? 'the configured database records'
          : 'the current fictional demo records'}
        . Cases include drafts and published records.
      </p>
      <dl className="admin-stats">
        {stats.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      <div className="admin-dashboard-grid">
        <section className="admin-panel">
          <h3>Recent content activity</h3>
          {!data.activity.length && <p>No content activity yet.</p>}
          <ol className="admin-activity">
            {data.activity.slice(0, 10).map((a) => (
              <li key={a.id}>
                <p>{a.message}</p>
                <time dateTime={a.at}>{new Date(a.at).toLocaleString()}</time>
              </li>
            ))}
          </ol>
        </section>
        <section className="admin-panel">
          <h3>Analytics</h3>
          <p className="admin-notice">Analytics not connected</p>
          <p>
            Visitor statistics are the priority. Provider, privacy and retention
            decisions are pending.
          </p>
          <p>
            No traffic, visitor or engagement data is collected. Content counts
            above are not analytics.
          </p>
        </section>
      </div>
    </>
  );
}

export function AdminRecords({ kind }: { kind: RecordKind }) {
  const data = useSnapshot();
  const env = useDemoEnvironment();
  const listHeading = useRef<HTMLHeadingElement>(null);
  const returnAfterDelete = useRef(false);
  const [search, setSearch] = useState(''),
    [status, setStatus] = useState(''),
    [category, setCategory] = useState('');
  const [remove, setRemove] = useState<{ id: string; title: string } | null>(
      null,
    ),
    [feedback, setFeedback] = useState(''),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!busy && returnAfterDelete.current) {
      returnAfterDelete.current = false;
      listHeading.current?.focus({ preventScroll: true });
    }
  }, [busy, feedback, error]);
  const records = ordered<AdminArticle | AdminCase | AdminTeam>(data[kind]);
  const filtered = !!(search || status || category);
  const visible = records.filter((r) => {
    const label = 'title' in r ? r.title : r.label;
    const author =
      'sampleAuthor' in r ? r.sampleAuthor : 'role' in r ? r.role : '';
    return (
      `${label} ${author}`
        .toLowerCase()
        .includes(search.toLowerCase().trim()) &&
      (!status || ('status' in r && r.status === status)) &&
      (!category || ('categoryId' in r && r.categoryId === category))
    );
  });
  async function action(run: () => Promise<void>, success: string) {
    setBusy(true);
    setError('');
    try {
      await run();
      setFeedback(success);
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  function move(index: number, offset: number) {
    const ids = records.map((r) => r.id);
    [ids[index], ids[index + offset]] = [ids[index + offset], ids[index]];
    void action(
      () => env.admin.reorder(kind, ids),
      env.backend ? 'Display order saved.' : 'Demo display order saved.',
    );
  }
  const title =
    kind === 'team' ? 'Team' : kind === 'cases' ? 'Cases' : 'Articles';
  return (
    <>
      <div className="admin-heading">
        <div>
          <h2 ref={listHeading} tabIndex={-1}>
            {title}
          </h2>
          <p>
            {env.backend
              ? 'Approved content workspace. Public pages show only published records.'
              : kind === 'team'
                ? 'Sample identities and neutral avatar artwork only.'
                : 'Drafts are visible here; only published demo records appear on public pages.'}
          </p>
        </div>
        <ButtonLink to={adminPath(kind, 'new')}>
          Create{' '}
          {kind === 'team'
            ? env.backend
              ? 'member'
              : 'sample member'
            : kind === 'cases'
              ? 'case'
              : 'article'}
        </ButtonLink>
      </div>
      <div className="admin-filters">
        <TextField
          name="record-search"
          label={`Search ${kind}`}
          required={false}
          max={180}
          value={search}
          onChange={setSearch}
        />
        {kind !== 'team' && (
          <>
            <Field id="record-status" label="Publication status">
              <Select
                id="record-status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="">All statuses</option>
                <option value="draft">Draft</option>
                <option value="published">Published</option>
              </Select>
            </Field>
            <Field id="record-category" label="Category">
              <Select
                id="record-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="">All categories</option>
                {data.settings.categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {categoryDisplay(c)}
                  </option>
                ))}
              </Select>
            </Field>
          </>
        )}
      </div>
      {feedback && (
        <p role="status" className="admin-feedback">
          {feedback}
        </p>
      )}
      {error && (
        <p role="alert" className="field-error">
          {error}
        </p>
      )}
      {filtered && (
        <p className="field-hint">
          Clear filters to reorder the full collection.
        </p>
      )}
      {!visible.length ? (
        <EmptyState
          title={
            filtered
              ? env.backend
                ? 'No records match these filters.'
                : 'No demo records match.'
              : `No ${env.backend ? '' : 'demo '}${title.toLowerCase()} yet.`
          }
          description={
            filtered
              ? 'Try a different search or reset the filters.'
              : env.backend
                ? 'Use the create action above to add an approved record.'
                : 'Use the create action above to add a fictional demo record.'
          }
          onReset={filtered ? () => {
            setSearch('');
            setStatus('');
            setCategory('');
          } : undefined}
        />
      ) : (
        <ol className="admin-records">
          {visible.map((record) => {
            const index = records.findIndex((r) => r.id === record.id),
              label = 'title' in record ? record.title : record.label;
            return (
              <li key={record.id}>
                <div>
                  <h3>
                    <Link to={adminPath(kind, record.id)}>{label}</Link>
                  </h3>
                  <p>
                    {'status' in record && (
                      <span className={`admin-badge is-${record.status}`}>
                        {record.status}
                      </span>
                    )}{' '}
                    {'categoryId' in record
                      ? categoryDisplay(
                          data.settings.categories.find(
                            (c) => c.id === record.categoryId,
                          ),
                        )
                      : record.role}
                  </p>
                  <span className="sample-tag">
                    {env.backend ? 'Backend record' : 'Fictional demo'}
                    {'featured' in record && record.featured
                      ? ' / Featured'
                      : ''}
                  </span>
                </div>
                <div className="admin-actions">
                  <Button
                    variant="secondary"
                    disabled={busy || filtered || index === 0}
                    onClick={() => move(index, -1)}
                    aria-label={`Move ${label} up`}
                  >
                    ↑ Up
                  </Button>
                  <Button
                    variant="secondary"
                    disabled={busy || filtered || index === records.length - 1}
                    onClick={() => move(index, 1)}
                    aria-label={`Move ${label} down`}
                  >
                    ↓ Down
                  </Button>
                  <Link
                    className="button button-secondary"
                    to={adminPath(kind, record.id)}
                  >
                    Edit
                  </Link>
                  <Button
                    variant="secondary"
                    disabled={busy}
                    onClick={() => setRemove({ id: record.id, title: label })}
                    aria-label={`Delete ${label}`}
                  >
                    Delete
                  </Button>
                </div>
              </li>
            );
          })}
        </ol>
      )}
      {remove && (
        <ConfirmDialog
          title={
            env.backend
              ? 'Delete content record?'
              : `Delete ${kind === 'team' ? 'sample member' : 'demo record'}?`
          }
          confirmLabel={env.backend ? 'Delete record' : 'Delete demo record'}
          onCancel={() => setRemove(null)}
          onConfirm={() => {
            const id = remove.id;
            returnAfterDelete.current = true;
            setRemove(null);
            void action(
              () => env.admin.deleteRecord(kind, id),
              env.backend ? 'Record deleted.' : 'Demo record deleted.',
            );
          }}
        >
          <p>{remove.title}</p>
          <p>
            {env.backend
              ? 'This deletes the record from the configured backend.'
              : 'This removes the fictional record from the local demo.'}{' '}
            A converted submission cannot be converted again after its draft is
            deleted.
          </p>
        </ConfirmDialog>
      )}
    </>
  );
}

function newArticle(data: AdminSnapshot): AdminArticle {
  return {
    id: '',
    title: '',
    slug: '',
    summary: '',
    categoryId: data.settings.categories[0]?.id ?? '',
    categoryLabel: data.settings.categories[0]?.label ?? '',
    sampleAuthor: 'Sample author',
    body: [{ type: 'paragraph', text: '' }],
    featured: false,
    artwork: 'institutions',
    publicationLabel: 'Local demo / Date pending',
    readingMinutes: 1,
    status: 'draft',
    order: data.articles.length,
    fictional: true,
  };
}
function newCase(data: AdminSnapshot): AdminCase {
  return {
    id: '',
    title: '',
    slug: '',
    summary: '',
    categoryId: data.settings.categories[0]?.id ?? '',
    categoryLabel: data.settings.categories[0]?.label ?? '',
    body: [{ type: 'paragraph', text: '' }],
    featured: false,
    reference: 'SAMPLE–NEW',
    kind: 'Case study',
    setting: 'Sample setting — pending',
    dateLabel: 'Date pending',
    tags: [],
    sourceNote:
      'Fictional local demo. Sources and supporting documents are not uploaded or verified.',
    supportingDocuments: [],
    status: 'draft',
    order: data.cases.length,
    fictional: true,
  };
}
function newTeam(data: AdminSnapshot): AdminTeam {
  return {
    id: '',
    label: '',
    role: '',
    description: '',
    artwork: 'avatar',
    links: [],
    order: data.team.length,
    fictional: true,
  };
}
export function AdminRecordEditor({ kind }: { kind: RecordKind }) {
  const { id } = useParams();
  const data = useSnapshot();
  const env = useDemoEnvironment();
  const existing = data[kind].find((r) => r.id === id);
  if (id !== 'new' && !existing)
    return (
      <>
        <h2>{env.backend ? 'Record not found' : 'Demo record not found'}</h2>
        <p>It may have been removed in another tab.</p>
        <ButtonLink to={adminPath(kind)}>Back to {kind}</ButtonLink>
      </>
    );
  return (
    <RecordForm
      key={`${kind}-${id}`}
      kind={kind}
      initial={
        existing ??
        (env.backend
          ? {
              ...(kind === 'articles'
                ? newArticle(data)
                : kind === 'cases'
                  ? newCase(data)
                  : newTeam(data)),
              fictional: false,
              ...(kind === 'articles'
                ? { sampleAuthor: '', publicationLabel: '', authorId: '' }
                : kind === 'cases'
                  ? {
                      reference: '',
                      setting: '',
                      dateLabel: '',
                      sourceNote: '',
                    }
                  : { status: 'draft' as const }),
            }
          : kind === 'articles'
            ? newArticle(data)
            : kind === 'cases'
              ? newCase(data)
              : newTeam(data))
      }
    />
  );
}
function RecordForm({
  kind,
  initial,
}: {
  kind: RecordKind;
  initial: AdminArticle | AdminCase | AdminTeam;
}) {
  const data = useSnapshot();
  const env = useDemoEnvironment();
  const draftKey = `${kind}-${initial.id || 'new'}`;
  const [resumed] = useState<EditorDraft | undefined>(() =>
    import.meta.hot ? resumedEditorDraft(draftKey) : undefined,
  );
  const [record, setRecord] = useState(() =>
      structuredClone(resumed?.record ?? initial),
    ),
    [baseline, setBaseline] = useState(
      () => resumed?.baseline ?? JSON.stringify(initial),
    );
  const [tagsText, setTagsText] = useState(
    () =>
      resumed?.tagsText ?? ('tags' in initial ? initial.tags.join(', ') : ''),
  );
  const [documentText, setDocumentText] = useState(
    () =>
      resumed?.documentText ??
      ('supportingDocuments' in initial
        ? (initial.supportingDocuments ?? []).join('\n')
        : ''),
  );
  useEffect(() => {
    if (!import.meta.hot) return;
    return rememberEditorDraft(draftKey, {
      record,
      baseline,
      tagsText,
      documentText,
    });
  }, [draftKey, record, baseline, tagsText, documentText]);
  const [confirmed, setConfirmed] = useState(false),
    [busy, setBusy] = useState(false),
    [feedback, setFeedback] = useState(''),
    [error, setError] = useState(''),
    [fields, setFields] = useState<Record<string, string>>({});
  const [uploadBusy, setUploadBusy] = useState(false),
    [validationFailure, setValidationFailure] = useState(false),
    [dismissed, setDismissed] = useState(false);
  const saving = useRef(false);
  const validationFocus = useRef<string | null>(null);
  useEffect(() => {
    if (busy || !validationFocus.current) return;
    const field = validationFocus.current;
    validationFocus.current = null;
    const contentError = field.startsWith('body.')
      ? document.querySelector<HTMLButtonElement>(
          `[data-content-error="${field}"]`,
        )
      : null;
    if (contentError) contentError.click();
    else {
      const target = document.getElementById(
        field === 'authorId'
          ? 'author-id'
          : field.startsWith('body')
            ? 'body'
            : field,
      );
      target?.focus();
    }
  }, [busy, fields]);
  const uploadIssue = useCallback((message: string) => {
    if (message) setDismissed(true);
    setFields((previous) => {
      const next = { ...previous };
      delete next.coverAssetId;
      if (message) next.coverAssetId = message;
      return next;
    });
  }, []);
  const dirty = JSON.stringify(record) !== baseline;
  const unsaved = useUnsavedChanges(dirty);
  const article = kind === 'articles' ? (record as AdminArticle) : null,
    caseRecord = kind === 'cases' ? (record as AdminCase) : null,
    team = kind === 'team' ? (record as AdminTeam) : null;
  const content = article ?? caseRecord;
  const update = useCallback(
    (patch: Partial<AdminArticle & AdminCase & AdminTeam>) => {
      setRecord((r) => ({ ...r, ...patch }));
      setFeedback('');
      setFields((previous) => {
        const next = { ...previous };
        for (const key of Object.keys(patch)) {
          if (
            key === 'body' &&
            Object.keys(previous).some((name) => name.startsWith('body'))
          ) {
            Object.keys(next)
              .filter((name) => name.startsWith('body'))
              .forEach((name) => delete next[name]);
            Object.assign(next, blockErrors(patch.body!));
          } else delete next[key];
        }
        return next;
      });
    },
    [],
  );
  async function save(status?: 'draft' | 'published') {
    if (saving.current || uploadBusy) return;
    saving.current = true;
    setBusy(true);
    setFeedback('');
    setDismissed(false);
    try {
      if (!confirmed && !env.backend)
        throw new DemoValidationError({
          fictional: 'Confirm that all edits are fictional before saving.',
        });
      const incoming = {
        ...record,
        ...(status ? { status } : {}),
        ...(caseRecord
          ? {
              tags: tagsText
                .split(',')
                .map((tag) => tag.trim())
                .filter(Boolean),
              supportingDocuments: documentText
                .split('\n')
                .map((label) => label.trim())
                .filter(Boolean),
            }
          : {}),
        fictional: !env.backend,
      };
      const saved =
        kind === 'articles'
          ? await env.admin.saveArticle(incoming as AdminArticle)
          : kind === 'cases'
            ? await env.admin.saveCase(incoming as AdminCase)
            : await env.admin.saveTeam(incoming as AdminTeam);
      setRecord(saved);
      if ('tags' in saved) {
        setTagsText(saved.tags.join(', '));
        setDocumentText((saved.supportingDocuments ?? []).join('\n'));
      }
      setBaseline(JSON.stringify(saved));
      setConfirmed(false);
      setError('');
      setFields({});
      setValidationFailure(false);
      setFeedback(
        `Saved ${'status' in saved ? saved.status : env.backend ? 'member' : 'sample member'} ${env.backend ? 'to the backend.' : 'to local demo only.'}`,
      );
    } catch (e) {
      const failure = env.backend ? actionError(e, 'save') : e;
      setError(message(failure));
      setValidationFailure(failure instanceof DemoValidationError);
      if (failure instanceof DemoValidationError) {
        setFields(failure.fields);
        validationFocus.current = Object.keys(failure.fields)[0] ?? null;
      } else {
        setFields({ save: message(failure) });
      }
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }
  const text = (
    name: string,
    label: string,
    value: string,
    onChange: (v: string) => void,
    multiline = false,
    max = 180,
    required = true,
    hint?: string,
  ) => (
    <TextField
      key={name}
      name={name}
      label={label}
      value={value}
      onChange={onChange}
      multiline={multiline}
      max={max}
      required={required}
      hint={hint}
      error={fields[name]}
    />
  );
  return (
    <>
      <div className="admin-heading">
        <div>
          <h2>
            {record.id ? 'Edit' : 'Create'}{' '}
            {kind === 'team'
              ? env.backend
                ? 'member'
                : 'sample member'
              : kind === 'cases'
                ? 'case'
                : 'article'}
          </h2>
          <p>
            {dirty
              ? env.backend
                ? 'Unsaved edits'
                : 'Unsaved fictional edits'
              : 'No unsaved changes'}
            {'status' in record
              ? ` / Current saved state: ${JSON.parse(baseline).status}`
              : ''}
          </p>
        </div>
        <Link className="text-link" to={adminPath(kind)}>
          Back to {kind}
        </Link>
      </div>
      <form
        className="admin-form"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          if (!e.currentTarget.reportValidity()) return;
          const submitter = (e.nativeEvent as SubmitEvent)
            .submitter as HTMLButtonElement | null;
          void save(
            submitter?.value === 'published'
              ? 'published'
              : content
                ? 'draft'
                : undefined,
          );
        }}
      >
        {(validationFailure ? Object.values(fields)[0] : error) &&
          !dismissed && (
            <ErrorToast
              message={validationFailure ? Object.values(fields)[0] : error}
              onDismiss={() => setDismissed(true)}
            />
          )}
        {feedback && (
          <p role="status" className="admin-feedback">
            {feedback}
          </p>
        )}
        {content && (
          <>
            {text('title', 'Title', content.title, (title) =>
              update({ title }),
            )}
            {text(
              'slug',
              'Slug',
              content.slug,
              (slug) => update({ slug }),
              false,
              160,
              true,
              'Lowercase letters, numbers and single hyphens. Draft slugs must also be unique.',
            )}
            {text(
              'summary',
              'Excerpt',
              content.summary,
              (summary) => update({ summary }),
              true,
              1200,
            )}
            <Field id="categoryId" label="Category" error={fields.categoryId}>
              <Select
                id="categoryId"
                value={content.categoryId}
                onChange={(e) => update({ categoryId: e.target.value })}
              >
                {data.settings.categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {categoryDisplay(c)}
                  </option>
                ))}
              </Select>
            </Field>
          </>
        )}
        {article && env.backend && (
          <BackendAuthorSelect
            value={article.authorId ?? ''}
            fieldError={fields.authorId}
            onChange={(authorId) => update({ authorId })}
          />
        )}
        {article && (
          <>
            {!env.backend &&
              text(
                'sampleAuthor',
                'Sample author',
                article.sampleAuthor,
                (sampleAuthor) => update({ sampleAuthor }),
                false,
                120,
              )}
            {!env.backend && (
              <Field id="artwork" label="Saved cover — bundled artwork">
                <Select
                  id="artwork"
                  value={article.artwork}
                  onChange={(e) =>
                    update({
                      artwork: e.target.value as ArtworkId,
                      coverUrl: undefined,
                      coverAlt: undefined,
                    })
                  }
                >
                  {Object.entries(editorialMedia)
                    .filter(([key]) => key !== 'avatar')
                    .map(([key, media]) => (
                      <option key={key} value={key}>
                        {media.caption}
                      </option>
                    ))}
                </Select>
              </Field>
            )}
            <EditorialArtwork
              artwork={article.artwork}
              asset={article}
              className="admin-cover"
            />
            {env.backend ? (
              <AssetUpload
                onBusyChange={setUploadBusy}
                onIssue={uploadIssue}
                onSaved={(asset) =>
                  update({
                    coverAssetId: asset.id,
                    coverUrl: asset.url,
                    coverAlt: asset.label,
                  })
                }
              />
            ) : (
              <LocalImagePreview
                onSaved={(coverUrl, coverAlt) => update({ coverUrl, coverAlt })}
              />
            )}
            {(article.coverUrl || article.coverAssetId) && (
              <Button
                type="button"
                variant="secondary"
                onClick={() =>
                  update({
                    coverUrl: undefined,
                    coverAlt: undefined,
                    coverAssetId: undefined,
                  })
                }
                disabled={uploadBusy || busy}
              >
                Remove uploaded cover
              </Button>
            )}
            {!env.backend &&
              text(
                'coverAlt',
                'Cover description',
                article.coverAlt ?? '',
                (coverAlt) => update({ coverAlt }),
                false,
                240,
                false,
                'Describe the actual image for readers using assistive technology.',
              )}
            {text(
              'publicationLabel',
              env.backend ? 'Publication label' : 'Sample publication label',
              article.publicationLabel,
              (publicationLabel) => update({ publicationLabel }),
              false,
              160,
            )}
            <Field
              id="readingMinutes"
              label={
                env.backend
                  ? 'Reading duration (minutes)'
                  : 'Sample reading duration (minutes)'
              }
            >
              <Input
                id="readingMinutes"
                type="number"
                min={1}
                max={100}
                required
                value={article.readingMinutes}
                onChange={(e) =>
                  update({ readingMinutes: Number(e.target.value) })
                }
              />
            </Field>
          </>
        )}
        {caseRecord && (
          <>
            {text(
              'reference',
              env.backend ? 'Reference' : 'Sample reference',
              caseRecord.reference,
              (reference) => update({ reference }),
              false,
              80,
            )}
            <Field id="kind" label="Record type">
              <Select
                id="kind"
                value={caseRecord.kind}
                onChange={(e) =>
                  update({ kind: e.target.value as AdminCase['kind'] })
                }
              >
                <option>Case study</option>
                <option>Research note</option>
              </Select>
            </Field>
            {text(
              'setting',
              'Provisional setting',
              caseRecord.setting,
              (setting) => update({ setting }),
              false,
              160,
            )}
            {text(
              'dateLabel',
              'Provisional date',
              caseRecord.dateLabel,
              (dateLabel) => update({ dateLabel }),
              false,
              160,
            )}
            {text(
              'tags',
              'Tags (comma separated)',
              tagsText,
              (tags) => {
                setTagsText(tags);
                update({ tags: tags.split(',') });
              },
              false,
              1000,
              false,
            )}
            {!env.backend &&
              text(
                'supportingDocuments',
                'Supporting-document placeholders — not uploaded',
                documentText,
                (value) => {
                  setDocumentText(value);
                  update({ supportingDocuments: value.split('\n') });
                },
                true,
                3200,
                false,
                'One fictional document label per line. No files are uploaded or linked.',
              )}
            {text(
              'sourceNote',
              'Source limitation note',
              caseRecord.sourceNote,
              (sourceNote) => update({ sourceNote }),
              true,
              1200,
            )}
          </>
        )}
        {content && (
          <>
            <>
              {env.backend ? (
                <Suspense fallback={<LoadingState />}>
                  <RichEditor
                    blocks={content.body}
                    errors={Object.fromEntries(
                      Object.entries(fields).filter(([key]) =>
                        key.startsWith('body'),
                      ),
                    )}
                    onChange={(body) => update({ body })}
                  />
                </Suspense>
              ) : (
                <StructuredEditor
                  blocks={content.body}
                  onChange={(body) => update({ body })}
                />
              )}
            </>
            <label className="admin-checkbox">
              <input
                type="checkbox"
                checked={!!content.featured}
                onChange={(e) => update({ featured: e.target.checked })}
              />{' '}
              Featured on{' '}
              {env.backend ? 'the homepage' : 'the local demo homepage'} when
              published
            </label>
          </>
        )}
        {team && (
          <>
            {text(
              'label',
              env.backend ? 'Name' : 'Sample name',
              team.label,
              (label) => update({ label }),
              false,
              120,
            )}
            {text(
              'role',
              env.backend ? 'Role' : 'Sample role',
              team.role,
              (role) => update({ role }),
              false,
              120,
            )}
            {text(
              'description',
              env.backend ? 'Biography' : 'Sample biography',
              team.description,
              (description) => update({ description }),
              true,
              2000,
            )}
            <EditorialArtwork
              artwork="avatar"
              asset={team}
              className="admin-cover"
            />
            <p className="field-hint">
              {env.backend
                ? 'An approved profile image is required for public display.'
                : 'Saved sample members use neutral avatar artwork. Local previews do not replace public profiles.'}
            </p>
            {env.backend ? (
              <AssetUpload
                onSaved={(asset) =>
                  update({
                    coverAssetId: asset.id,
                    coverUrl: asset.url,
                    coverAlt: asset.label,
                  })
                }
              />
            ) : (
              <LocalImagePreview />
            )}
            <LinkEditor
              fictional={!env.backend}
              links={team.links ?? []}
              onChange={(links) => update({ links })}
            />
          </>
        )}
        {team && env.backend && (
          <label>
            <input
              type="checkbox"
              checked={team.status === 'published'}
              onChange={(e) =>
                update({ status: e.target.checked ? 'published' : 'draft' })
              }
            />{' '}
            Approved for public display (image required)
          </label>
        )}
        {caseRecord && env.backend && <CaseDocuments caseId={record.id} />}
        <Field
          id="order"
          label="Display order"
          hint="Lower numbers appear first. Collection up/down controls normalize the sequence."
          error={fields.order}
        >
          <Input
            id="order"
            type="number"
            min={0}
            max={1000}
            required
            value={record.order}
            onChange={(e) => update({ order: Number(e.target.value) })}
          />
        </Field>
        {!env.backend && (
          <FictionalConfirmation checked={confirmed} onChange={setConfirmed} />
        )}
        {Object.keys(fields).length > 0 && (
          <section
            className="editor-error-summary"
            aria-label="Errors to resolve"
          >
            <strong>Check these fields before saving</strong>
            <ul>
              {Object.entries(fields).map(([field, message]) => (
                <li key={field}>
                  <a
                    href={`#${field.startsWith('body') ? 'body' : field === 'authorId' ? 'author-id' : field}`}
                    onClick={(event) => {
                      event.preventDefault();
                      const item = field.startsWith('body.')
                        ? document.querySelector<HTMLButtonElement>(
                            `[data-content-error="${field}"]`,
                          )
                        : null;
                      if (item) item.click();
                      else {
                        const target = document.getElementById(
                          field === 'authorId'
                            ? 'author-id'
                            : field.startsWith('body')
                              ? 'body'
                              : field,
                        );
                        target?.scrollIntoView({ block: 'center' });
                        target?.focus({ preventScroll: true });
                      }
                    }}
                  >
                    {message}
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}
        {fields.save && (
          <p id="save-error" className="field-error">
            {fields.save}
          </p>
        )}
        <div
          className="admin-actions"
          id="save"
          tabIndex={-1}
          aria-describedby={fields.save ? 'save-error' : undefined}
        >
          <Button
            variant="secondary"
            disabled={busy || uploadBusy}
            type="submit"
            name="save"
            value="draft"
          >
            {busy
              ? 'Saving…'
              : team
                ? env.backend
                  ? 'Save member'
                  : 'Save sample member'
                : content?.status === 'published'
                  ? 'Unpublish to draft'
                  : 'Save draft'}
          </Button>
          {content && (
            <Button
              type="submit"
              name="save"
              value="published"
              disabled={busy || uploadBusy}
            >
              {content.status === 'published'
                ? env.backend
                  ? 'Save published content'
                  : 'Save published demo'
                : env.backend
                  ? 'Publish approved content'
                  : 'Publish to local demo'}
            </Button>
          )}
        </div>
      </form>
      {record.id && !initial.id && (
        <Link className="text-link" to={adminPath(kind, record.id)}>
          Open saved {env.backend ? 'record' : 'demo record'}
        </Link>
      )}
      {unsaved.dialog}
    </>
  );
}

export function AdminSubmissions() {
  const data = useSnapshot(),
    env = useDemoEnvironment();
  const [status, setStatus] = useState(''),
    [feedback, setFeedback] = useState(''),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  async function run(action: () => Promise<unknown>, success: string) {
    setBusy(true);
    setError('');
    try {
      await action();
      setFeedback(success);
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  const items = data.submissions.filter((s) => !status || s.status === status);
  return (
    <>
      <h2>Submissions</h2>
      <p>
        {env.backend
          ? 'Private submissions from the configured backend.'
          : 'Fictional samples only. Public submission delivery is not connected.'}{' '}
        Approval never publishes; conversion creates one draft.
      </p>
      <p className="admin-notice">
        Originals and contributor identities are private. Double-blind review is
        requested; its anonymization and reviewer workflow remain pending.
        Approval here does not certify that review has taken place.
      </p>
      <Field id="submission-status" label="Review status">
        <Select
          id="submission-status"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">All reviews</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </Select>
      </Field>
      {feedback && (
        <p role="status" className="admin-feedback">
          {feedback}
        </p>
      )}
      {error && <p role="alert">{error}</p>}
      {!items.length && (
        <EmptyState
          title={
            status
              ? env.backend
                ? 'No submissions match this review status.'
                : 'No sample submissions match.'
              : env.backend
                ? 'No submissions to review.'
                : 'No sample submissions to review.'
          }
          description={
            status
              ? 'Choose another review status or reset the filter.'
              : 'There are no submissions in this workspace.'
          }
          onReset={status ? () => setStatus('') : undefined}
        />
      )}
      {items.map((s) => (
        <article className="admin-panel" key={s.id}>
          <span className="sample-tag">
            {env.backend ? 'Private submission' : 'Fictional submission'} /{' '}
            {s.status}
          </span>
          <h3>{s.title}</h3>
          <p>
            {s.author} /{' '}
            {categoryDisplay(
              data.settings.categories.find((c) => c.id === s.categoryId),
            )}
          </p>
          <p>{s.excerpt}</p>
          <details>
            <summary>
              {env.backend ? 'Read submission' : 'Read sample submission'}
            </summary>
            <StructuredContent blocks={s.body} />
          </details>
          {env.backend && <SubmissionAttachments id={s.id} />}
          <div className="admin-actions">
            <Button
              variant="secondary"
              disabled={
                busy || !!s.convertedArticleId || s.status === 'approved'
              }
              onClick={() =>
                void run(
                  () => env.admin.reviewSubmission(s.id, 'approved'),
                  env.backend
                    ? 'Submission approved; nothing published.'
                    : 'Sample submission approved; nothing published.',
                )
              }
            >
              Approve
            </Button>
            <Button
              variant="secondary"
              disabled={
                busy || !!s.convertedArticleId || s.status === 'rejected'
              }
              onClick={() =>
                void run(
                  () => env.admin.reviewSubmission(s.id, 'rejected'),
                  env.backend
                    ? 'Submission rejected.'
                    : 'Sample submission rejected.',
                )
              }
            >
              Reject
            </Button>
            <Button
              disabled={
                busy || s.status !== 'approved' || !!s.convertedArticleId
              }
              onClick={() =>
                void run(
                  () => env.admin.convertSubmission(s.id),
                  'Converted once to an article draft. Nothing published.',
                )
              }
            >
              Convert to draft
            </Button>
          </div>
          {s.convertedArticleId && (
            <p>
              Already converted once.{' '}
              {data.articles.some((a) => a.id === s.convertedArticleId) ? (
                <Link to={adminPath('articles', s.convertedArticleId)}>
                  Open converted article
                </Link>
              ) : (
                'The converted article was removed; duplicate conversion is disabled.'
              )}
            </p>
          )}
        </article>
      ))}
    </>
  );
}

export function AdminSettingsPage() {
  const data = useSnapshot();
  return <SettingsForm initial={data.settings} />;
}
function SettingsForm({ initial }: { initial: AdminSettings }) {
  const data = useSnapshot(),
    env = useDemoEnvironment();
  const [settings, setSettings] = useState(() => structuredClone(initial)),
    [baseline, setBaseline] = useState(() => JSON.stringify(initial)),
    [confirmed, setConfirmed] = useState(false),
    [busy, setBusy] = useState(false),
    [feedback, setFeedback] = useState(''),
    [error, setError] = useState('');
  const dirty = JSON.stringify(settings) !== baseline;
  const unsaved = useUnsavedChanges(dirty);
  function change(patch: Partial<AdminSettings>) {
    setSettings((s) => ({ ...s, ...patch }));
    setFeedback('');
  }
  function moveSection(index: number, offset: number) {
    const sections = [...settings.sections];
    [sections[index], sections[index + offset]] = [
      sections[index + offset],
      sections[index],
    ];
    change({ sections });
  }
  function featureList(
    field: 'featuredArticleIds' | 'featuredCaseIds',
    kind: 'articles' | 'cases',
  ) {
    const selected = settings[field];
    function move(index: number, offset: number) {
      const ids = [...selected];
      [ids[index], ids[index + offset]] = [ids[index + offset], ids[index]];
      change({ [field]: ids });
    }
    return (
      <fieldset className="admin-fieldset">
        <legend>Featured {kind}</legend>
        <p className="field-hint">
          {kind === 'articles'
            ? `Published articles only. The first ${heroCoverLimit} form the 3D hero; the carousel includes the full selection in this same order. Covers come from the article editor. Removing a feature keeps the article.`
            : 'Up/down controls set the public featured order. Selected drafts remain hidden until published.'}
        </p>
        {ordered<AdminArticle | AdminCase>(data[kind])
          .filter(
            (r) =>
              kind !== 'articles' ||
              r.status === 'published' ||
              selected.includes(r.id),
          )
          .map((r) => (
            <label className="admin-checkbox" key={r.id}>
              <input
                type="checkbox"
                checked={selected.includes(r.id)}
                disabled={
                  kind === 'articles' &&
                  r.status !== 'published' &&
                  !selected.includes(r.id)
                }
                onChange={(e) =>
                  change({
                    [field]: e.target.checked
                      ? [...selected, r.id]
                      : selected.filter((id) => id !== r.id),
                  })
                }
              />
              {r.title} ({r.status})
            </label>
          ))}
        <ol className="admin-order-list">
          {selected.map((id, index) => {
            const item = data[kind].find((r) => r.id === id);
            return (
              <li key={id}>
                <div className="admin-feature-preview">
                  {kind === 'articles' && item && (
                    <img
                      src={articleCover(item as AdminArticle)}
                      alt={
                        (item as AdminArticle).coverAlt ??
                        'Article cover preview'
                      }
                    />
                  )}
                  <div>
                    <span className="eyebrow">
                      {String(index + 1).padStart(2, '0')}
                      {kind === 'articles' && index < heroCoverLimit
                        ? ' / Hero + carousel'
                        : ' / Carousel'}
                    </span>
                    <h3>{item?.title ?? 'Unavailable article'}</h3>
                    <p>{item?.summary}</p>
                    {item && (
                      <Link to={adminPath(kind, id)}>Edit article & cover</Link>
                    )}
                  </div>
                </div>
                <div className="admin-actions">
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={!index}
                    aria-label={`Move featured ${kind} ${index + 1} up`}
                    onClick={() => move(index, -1)}
                  >
                    ↑ Up
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={index === selected.length - 1}
                    aria-label={`Move featured ${kind} ${index + 1} down`}
                    onClick={() => move(index, 1)}
                  >
                    ↓ Down
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    aria-label={`Remove featured ${kind} ${index + 1}`}
                    onClick={() =>
                      change({
                        [field]: selected.filter((value) => value !== id),
                      })
                    }
                  >
                    Remove feature
                  </Button>
                </div>
              </li>
            );
          })}
        </ol>
      </fieldset>
    );
  }
  async function save() {
    setBusy(true);
    setError('');
    try {
      if (!confirmed && !env.backend)
        throw Error('Confirm fictional content before saving.');
      await env.admin.saveSettings(settings);
      const latest = env.backend
        ? (await env.admin.readSnapshot()).settings
        : settings;
      setSettings(latest);
      setBaseline(JSON.stringify(latest));
      setConfirmed(false);
      setFeedback(
        env.backend
          ? 'Homepage settings saved to the backend.'
          : 'Homepage/content settings saved to the local demo.',
      );
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <h2>Homepage & content settings</h2>
      <p>
        {env.backend
          ? 'Manage approved homepage copy, section visibility, featured content and public contact details.'
          : 'Edit the existing demo composition. Branding remains provisional.'}
      </p>
      <p>
        {dirty
          ? env.backend
            ? 'Unsaved edits'
            : 'Unsaved fictional edits'
          : 'No unsaved changes'}
      </p>
      <form
        className="admin-form"
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        {feedback && (
          <p role="status" className="admin-feedback">
            {feedback}
          </p>
        )}
        {error && (
          <p role="alert" className="field-error">
            {error}
          </p>
        )}
        <fieldset className="admin-fieldset">
          <legend>Hero copy</legend>
          <TextField
            name="hero-eyebrow"
            label="Hero eyebrow"
            max={100}
            value={settings.hero.eyebrow}
            onChange={(eyebrow) =>
              change({ hero: { ...settings.hero, eyebrow } })
            }
          />
          {settings.hero.lines.map((line, index) => (
            <TextField
              key={index}
              name={`hero-line-${index}`}
              label={`Headline line ${index + 1}`}
              max={100}
              value={line}
              onChange={(value) => {
                const lines = [...settings.hero.lines] as [
                  string,
                  string,
                  string,
                ];
                lines[index] = value;
                change({ hero: { ...settings.hero, lines } });
              }}
            />
          ))}
          <TextField
            name="hero-introduction"
            label="Hero introduction"
            multiline
            max={600}
            value={settings.hero.introduction}
            onChange={(introduction) =>
              change({ hero: { ...settings.hero, introduction } })
            }
          />
        </fieldset>
        <fieldset className="admin-fieldset">
          <legend>Confirmed research areas / Legacy mappings pending</legend>
          {settings.categories.map((category, index) => (
            <div className="admin-block" key={category.id}>
              <p>
                <strong>{categoryDisplay(category)}</strong>
              </p>
              <TextField
                name={`focus-description-${index}`}
                label={`Focus ${index + 1} description`}
                multiline
                max={400}
                value={category.description}
                onChange={(description) =>
                  change({
                    categories: settings.categories.map((c, i) =>
                      i === index ? { ...c, description } : c,
                    ),
                  })
                }
              />
            </div>
          ))}
        </fieldset>
        <fieldset className="admin-fieldset">
          <legend>Optional homepage sections</legend>
          <ol className="admin-order-list">
            {settings.sections.map((section, index) => (
              <li key={section.id}>
                <label className="admin-checkbox">
                  <input
                    type="checkbox"
                    checked={section.visible}
                    onChange={(e) =>
                      change({
                        sections: settings.sections.map((s) =>
                          s.id === section.id
                            ? { ...s, visible: e.target.checked }
                            : s,
                        ),
                      })
                    }
                  />
                  Show {section.label}
                </label>
                <div className="admin-actions">
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={!index}
                    aria-label={`Move ${section.label} section up`}
                    onClick={() => moveSection(index, -1)}
                  >
                    ↑ Up
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={index === settings.sections.length - 1}
                    aria-label={`Move ${section.label} section down`}
                    onClick={() => moveSection(index, 1)}
                  >
                    ↓ Down
                  </Button>
                </div>
              </li>
            ))}
          </ol>
        </fieldset>
        {featureList('featuredArticleIds', 'articles')}
        {featureList('featuredCaseIds', 'cases')}
        <fieldset className="admin-fieldset">
          <legend>
            {env.backend
              ? 'Approved contact details'
              : 'Fictional contact details'}
          </legend>
          <TextField
            name="contact-email"
            label={env.backend ? 'Contact email' : 'Sample contact email'}
            required={false}
            max={160}
            value={settings.contact.email}
            hint={
              env.backend
                ? 'Use an approved public address, or leave empty.'
                : 'Use a fictional address such as research@example.org, or leave empty.'
            }
            onChange={(email) =>
              change({ contact: { ...settings.contact, email } })
            }
          />
          <TextField
            name="contact-address"
            label={env.backend ? 'Contact details' : 'Sample contact details'}
            required={false}
            multiline
            max={500}
            value={settings.contact.address}
            onChange={(address) =>
              change({ contact: { ...settings.contact, address } })
            }
          />
        </fieldset>
        <LinkEditor
          fictional={!env.backend}
          links={settings.socialLinks}
          onChange={(socialLinks) => change({ socialLinks })}
        />
        {!env.backend && (
          <FictionalConfirmation checked={confirmed} onChange={setConfirmed} />
        )}
        <Button type="submit" disabled={busy}>
          {busy
            ? 'Saving…'
            : env.backend
              ? 'Save approved settings'
              : 'Save demo settings'}
        </Button>
      </form>
      {unsaved.dialog}
    </>
  );
}

function BackendAuthorSelect({
  value,
  onChange,
  fieldError,
}: {
  value: string;
  onChange: (id: string) => void;
  fieldError?: string;
}) {
  const env = useDemoEnvironment();
  const [authors, setAuthors] = useState<{ id: string; label: string }[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const refresh = useRef<() => void>(() => {});
  useEffect(() => {
    let live = true;
    let pending = false;
    const load = async () => {
      if (pending || !env.backend) return;
      pending = true;
      setLoading(true);
      setError('');
      try {
        const records = await env.backend.catalog('authors');
        if (live) setAuthors(records.filter((author) => author.published));
      } catch (failure) {
        if (live) setError(authorError(failure, 'load'));
      } finally {
        pending = false;
        if (live) setLoading(false);
      }
    };
    const onReturn = () => {
      if (!document.hidden) void load();
    };
    refresh.current = () => void load();
    void load();
    window.addEventListener('focus', onReturn);
    document.addEventListener('visibilitychange', onReturn);
    return () => {
      live = false;
      window.removeEventListener('focus', onReturn);
      document.removeEventListener('visibilitychange', onReturn);
    };
  }, [env]);
  const missingSelection =
    !!value && !authors.some((author) => author.id === value);
  const unavailable =
    !loading && !error && missingSelection
      ? 'The selected author is no longer approved or available. Choose an approved author before publishing; you can still save a draft.'
      : '';
  const issue = fieldError || error || unavailable;
  return (
    <div className="admin-author-select">
      <Field
        id="author-id"
        label="Approved author"
        error={issue}
        hint="An approved author is required only when publishing; drafts can be saved without one."
      >
        <Select
          id="author-id"
          disabled={loading || !!error}
          aria-busy={loading}
          aria-invalid={!!issue}
          aria-describedby={
            issue
              ? 'author-id-error author-list-state'
              : 'author-id-hint author-list-state'
          }
          value={value}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">Select an author before publishing</option>
          {missingSelection && (
            <option value={value} disabled>
              Current author — approval not verified
            </option>
          )}
          {authors.map((a) => (
            <option key={a.id} value={a.id}>
              {a.label}
            </option>
          ))}
        </Select>
      </Field>
      <p
        className="field-hint"
        id="author-list-state"
        role="status"
        aria-live="polite"
      >
        {loading
          ? 'Loading approved authors…'
          : error
            ? 'Author loading failed. Use Retry authors below.'
            : authors.length === 0
              ? 'No approved authors yet. Add or approve an author in Authors, then return here and refresh the list.'
              : `${authors.length} approved ${authors.length === 1 ? 'author is' : 'authors are'} available.`}
      </p>
      {error && error !== issue && <p className="field-error">{error}</p>}
      <div className="admin-actions">
        <a
          className="text-link"
          href={adminPath('authors')}
          target="_blank"
          rel="noopener noreferrer"
        >
          Manage authors (opens in a new tab)
        </a>
        <Button
          type="button"
          variant="secondary"
          disabled={loading}
          onClick={() => refresh.current()}
        >
          {loading
            ? 'Loading authors…'
            : error
              ? 'Retry authors'
              : 'Refresh authors'}
        </Button>
      </div>
      <p className="field-hint">
        Keep this editor tab open. Refreshing authors updates only this list and
        preserves your article edits and selected cover.
      </p>
    </div>
  );
}

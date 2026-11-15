import { useCallback, useEffect, useRef, useState } from 'react';
import { useDemoEnvironment } from '../admin/context';
import { TextField, ConfirmDialog } from '../admin/ui';
import { Button, LoadingState } from '../components/ui';
import { useUnsavedChanges } from '../admin/use-unsaved-changes';
import type { Author, Asset } from './contracts';
import { authorError } from './author-errors';
import { ErrorToast } from '../admin/error-toast';
import {
  researchCategories,
  categoryDisplay,
} from '../config/research-categories';
const message = (e: unknown) =>
  e instanceof Error ? e.message : 'The backend action failed.';
export function CatalogPage({ kind }: { kind: 'categories' | 'authors' }) {
  const env = useDemoEnvironment();
  const [items, setItems] = useState<Author[] | null>(null),
    [record, setRecord] = useState<Author>({
      id: '',
      label: '',
      description: '',
      published: false,
    }),
    [baseline, setBaseline] = useState(JSON.stringify(record)),
    [error, setError] = useState(''),
    [feedback, setFeedback] = useState(''),
    [busy, setBusy] = useState(false),
    [remove, setRemove] = useState<Author | null>(null);
  const [loadError, setLoadError] = useState(''),
    [loading, setLoading] = useState(true),
    [dismissed, setDismissed] = useState(false);
  const saving = useRef(false);
  const unsaved = useUnsavedChanges(JSON.stringify(record) !== baseline);
  const load = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      if (env.backend) setItems(await env.backend.catalog(kind));
    } catch (e) {
      setLoadError(kind === 'authors' ? authorError(e, 'load') : message(e));
    } finally {
      setLoading(false);
    }
  }, [env, kind]);
  useEffect(() => {
    let live = true;
    env.backend?.catalog(kind).then(
      (a) => {
        if (live) {
          setItems(a);
          setLoading(false);
        }
      },
      (e) => {
        if (live) {
          setLoadError(
            kind === 'authors' ? authorError(e, 'load') : message(e),
          );
          setLoading(false);
        }
      },
    );
    return () => {
      live = false;
    };
  }, [env, kind]);
  if (!env.backend)
    return (
      <p>
        Catalog management is available in backend mode. Demo focus areas remain
        in Homepage & content.
      </p>
    );
  function choose(value: Author) {
    if (
      JSON.stringify(record) !== baseline &&
      !window.confirm('Discard unsaved catalog edits?')
    )
      return;
    setRecord(value);
    setBaseline(JSON.stringify(value));
  }
  async function save() {
    if (saving.current) return;
    saving.current = true;
    setBusy(true);
    setError('');
    setDismissed(false);
    setFeedback('');
    try {
      const saved = await env.backend!.saveCatalog(kind, record);
      setRecord(saved);
      setBaseline(JSON.stringify(saved));
      setFeedback(
        kind === 'authors'
          ? `Author saved${saved.published ? ' and approved' : ' without approval'}. Return to your article tab and choose Refresh authors; your article is not saved by this action.`
          : 'Catalog saved.',
      );
      await load();
    } catch (e) {
      setError(kind === 'authors' ? authorError(e, 'save') : message(e));
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }
  return (
    <>
      <h2>{kind === 'authors' ? 'Authors' : 'Categories'}</h2>
      <p>
        {kind === 'authors'
          ? 'Add the client-approved author name and biography, then explicitly approve the author for publication. Only active staff can save or approve authors. Keep your article editor open in its original tab.'
          : 'Publication visibility is explicit. Deletion is rejected while referenced by content.'}
      </p>
      {kind === 'authors' && error && !dismissed && (
        <ErrorToast message={error} onDismiss={() => setDismissed(true)} />
      )}
      {kind !== 'authors' && error && <p role="alert">{error}</p>}
      {feedback && <p role="status">{feedback}</p>}
      {loadError && (
        <div role="alert">
          <p className="field-error">{loadError}</p>
          <Button
            variant="secondary"
            disabled={loading}
            onClick={() => void load()}
          >
            Retry loading {kind}
          </Button>
        </div>
      )}
      {loading && <p role="status">Loading {kind}…</p>}
      {items && ((!loading && !loadError) || items.length > 0) ? (
        items.length === 0 && kind === 'authors' ? (
          <p role="status">
            No authors yet. Enter the approved details below to create the first
            author.
          </p>
        ) : (
          <ul className="admin-record-list">
            {items.map((r) => (
              <li key={r.id}>
                {kind === 'categories' ? categoryDisplay(r) : r.label} (
                {kind === 'authors'
                  ? r.published
                    ? 'Approved'
                    : 'Not approved'
                  : r.published
                    ? 'Public'
                    : 'Private'}
                ){' '}
                <Button
                  variant="secondary"
                  disabled={busy}
                  onClick={() => choose(r)}
                >
                  Edit {r.label}
                </Button>
                <Button
                  variant="secondary"
                  disabled={busy}
                  onClick={() => setRemove(r)}
                >
                  Delete {r.label}
                </Button>
              </li>
            ))}
          </ul>
        )
      ) : !loadError && !loading ? (
        <LoadingState />
      ) : null}
      <Button
        variant="secondary"
        disabled={busy}
        onClick={() =>
          choose({ id: '', label: '', description: '', published: false })
        }
      >
        New {kind === 'authors' ? 'author' : 'category'}
      </Button>
      <form
        className="admin-form"
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        {kind === 'categories' ? (
          <label htmlFor="catalog-label">
            Research category
            <select
              id="catalog-label"
              required
              disabled={busy}
              value={record.label}
              onChange={(e) => setRecord({ ...record, label: e.target.value })}
            >
              <option value="">Choose confirmed category</option>
              {record.label &&
                !researchCategories.some((c) => c.label === record.label) && (
                  <option value={record.label}>
                    {record.label} (mapping pending)
                  </option>
                )}
              {researchCategories.map((c) => (
                <option key={c.id}>{c.label}</option>
              ))}
            </select>
            <span className="field-hint">
              Existing relationships are retained. Selecting a confirmed
              category is an explicit editorial mapping; duplicates are rejected
              by the prepared migration.
            </span>
          </label>
        ) : (
          <TextField
            name="catalog-label"
            label="Name"
            value={record.label}
            onChange={(label) => setRecord({ ...record, label })}
            max={120}
            disabled={busy}
          />
        )}
        <TextField
          name="catalog-description"
          label={kind === 'authors' ? 'Biography' : 'Description'}
          multiline
          disabled={busy}
          required={false}
          value={record.description}
          onChange={(description) => setRecord({ ...record, description })}
          max={kind === 'authors' ? 2000 : 400}
        />
        <label>
          <input
            type="checkbox"
            disabled={busy}
            checked={record.published}
            onChange={(e) =>
              setRecord({ ...record, published: e.target.checked })
            }
          />{' '}
          {kind === 'authors'
            ? 'Approved author for publication'
            : 'Approved for public display'}
        </label>
        {error && kind === 'authors' && <p className="field-error">{error}</p>}
        <Button type="submit" disabled={busy}>
          {busy
            ? 'Saving…'
            : `Save ${kind === 'authors' ? 'author' : 'category'}`}
        </Button>
      </form>
      {remove && (
        <ConfirmDialog
          title="Delete catalog record?"
          onCancel={() => setRemove(null)}
          onConfirm={() => {
            void (async () => {
              try {
                await env.backend!.deleteCatalog(kind, remove.id);
                setRemove(null);
                await load();
              } catch (e) {
                setDismissed(false);
                setError(
                  kind === 'authors' ? authorError(e, 'delete') : message(e),
                );
                setRemove(null);
              }
            })();
          }}
        >
          <p>{remove.label}</p>
        </ConfirmDialog>
      )}
      {unsaved.dialog}
    </>
  );
}
export { AssetUpload } from './asset-upload';
import { AssetUpload } from './asset-upload';
export function CaseDocuments({ caseId }: { caseId: string }) {
  const env = useDemoEnvironment();
  const [records, setRecords] = useState<(Asset & { isPublic: boolean })[]>([]),
    [asset, setAsset] = useState<Asset | null>(null),
    [isPublic, setPublic] = useState(false),
    [error, setError] = useState('');
  const load = useCallback(async () => {
    try {
      if (env.backend) setRecords(await env.backend.documents(caseId));
    } catch (e) {
      setError(message(e));
    }
  }, [caseId, env]);
  useEffect(() => {
    let live = true;
    if (caseId)
      env.backend?.documents(caseId).then(
        (a) => {
          if (live) setRecords(a);
        },
        (e) => {
          if (live) setError(message(e));
        },
      );
    return () => {
      live = false;
    };
  }, [env, caseId]);
  return (
    <section className="admin-panel">
      <h3>Supporting documents</h3>
      {!caseId ? (
        <p>Save this case draft before attaching documents.</p>
      ) : (
        <>
          <ul>
            {records.map((r) => (
              <li key={r.id}>
                <a href={r.url} target="_blank" rel="noopener noreferrer">
                  {r.label}
                </a>{' '}
                ({r.isPublic ? 'Public when case published' : 'Staff only'}){' '}
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    if (window.confirm('Remove this document link?'))
                      void env
                        .backend!.removeDocument(r.id)
                        .then(load)
                        .catch((e) => setError(message(e)));
                  }}
                >
                  Remove
                </Button>
              </li>
            ))}
          </ul>
          <AssetUpload purpose="document" onSaved={setAsset} />
          {asset && (
            <>
              <label>
                <input
                  type="checkbox"
                  checked={isPublic}
                  onChange={(e) => setPublic(e.target.checked)}
                />{' '}
                Make document public when the case is published
              </label>
              <Button
                type="button"
                onClick={() =>
                  void env
                    .backend!.attachDocument(
                      caseId,
                      asset.id,
                      asset.label,
                      isPublic,
                    )
                    .then(() => {
                      setAsset(null);
                      void load();
                    })
                    .catch((e) => setError(message(e)))
                }
              >
                Attach {asset.label}
              </Button>
            </>
          )}
        </>
      )}
      {error && <p role="alert">{error}</p>}
    </section>
  );
}

export function SubmissionAttachments({ id }: { id: string }) {
  const env = useDemoEnvironment();
  const [items, setItems] = useState<Asset[] | null>(null),
    [error, setError] = useState('');
  useEffect(() => {
    let live = true;
    env.backend?.submissionAttachments(id).then(
      (a) => {
        if (live) setItems(a);
      },
      (e) => {
        if (live) setError(message(e));
      },
    );
    return () => {
      live = false;
    };
  }, [env, id]);
  return (
    <section>
      <h4>Private attachments</h4>
      {error ? (
        <p role="alert">{error}</p>
      ) : items ? (
        <ul>
          {items.map((a) => (
            <li key={a.id}>
              <a href={a.url} target="_blank" rel="noopener noreferrer">
                {a.label}
              </a>
            </li>
          ))}
        </ul>
      ) : (
        <LoadingState />
      )}
      {items?.length === 0 && <p>No attachments.</p>}
    </section>
  );
}

import { submissionPolicyReady } from '../config/submissions';
import { SubmissionDocuments } from '../components/submission-documents';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useDemoEnvironment } from '../admin/context';
import { useResource } from '../hooks/use-resource';
import { Button, LoadingState, PageIntro, PageShell } from '../components/ui';
import { TextField } from '../admin/ui';
type Turnstile = {
  render(node: HTMLElement, options: Record<string, unknown>): string;
  remove(id: string): void;
  reset(id: string): void;
};
declare global {
  interface Window {
    turnstile?: Turnstile;
  }
}
function Captcha({ onToken }: { onToken: (token: string) => void }) {
  const node = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let widget: string | undefined,
      live = true;
    const script = document.createElement('script');
    script.src =
      'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    script.async = true;
    const render = () => {
      if (live && node.current && window.turnstile)
        widget = window.turnstile.render(node.current, {
          sitekey: import.meta.env.VITE_TURNSTILE_SITE_KEY,
          action: 'article-submission',
          callback: onToken,
          'expired-callback': () => onToken(''),
          'error-callback': () => onToken(''),
        });
    };
    script.onload = render;
    script.onerror = () => onToken('');
    document.head.append(script);
    return () => {
      live = false;
      if (widget) window.turnstile?.remove(widget);
      script.remove();
    };
  }, [onToken]);
  return <div ref={node} aria-label="Submission abuse verification" />;
}
export function BackendSubmissionForm() {
  const env = useDemoEnvironment();
  const [start] = useState(() => Date.now());
  const [requestId] = useState(() => crypto.randomUUID());
  const [fields, setFields] = useState({
    title: '',
    excerpt: '',
    author: '',
    email: '',
    outline: '',
    website: '',
    categoryId: '',
  });
  const [file, setFile] = useState<File | null>(null),
    [token, setToken] = useState(''),
    [captchaEpoch, setEpoch] = useState(0),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [reference, setReference] = useState('');
  const load = useCallback(async () => {
    const r = await env.backend!.client.rpc('intake_enabled');
    if (r.error) throw Error('Submission availability could not be checked.');
    return {
      enabled:
        submissionPolicyReady &&
        r.data === true &&
        !!import.meta.env.VITE_TURNSTILE_SITE_KEY &&
        !import.meta.env.VITE_TURNSTILE_SITE_KEY.includes('PLACEHOLDER'),
      categories: await env.publicProvider.listCategories(),
    };
  }, [env]);
  const { state, retry } = useResource(load);
  async function send() {
    setBusy(true);
    setError('');
    try {
      if (!token) throw Error('Complete verification before sending.');
      const form = new FormData();
      for (const [k, v] of Object.entries(fields)) form.set(k, v);
      form.set('token', token);
      form.set('elapsed', String(Date.now() - start));
      form.set('requestId', requestId);
      if (file) form.set('attachment', file);
      const r = await env.backend!.client.functions.invoke(
        'public-submission',
        { body: form },
      );
      if (r.error || r.data?.accepted !== true)
        throw Error(
          'The server did not confirm acceptance. Your fields were retained; delivery may be unavailable.',
        );
      setReference(r.data.reference);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delivery unavailable.');
      setToken('');
      setEpoch((n) => n + 1);
    } finally {
      setBusy(false);
    }
  }
  return (
    <PageShell>
      <PageIntro eyebrow="Contributions" title="Submit an article">
        <p>
          Submissions are reviewed privately. Acceptance never publishes an
          article automatically.
        </p>
      </PageIntro>
      <div className="container reading-width bottom-space">
        {state.status === 'loading' ? (
          <LoadingState />
        ) : state.status === 'error' ? (
          <>
            <p role="alert">
              Submission availability could not be checked. Nothing was sent.
            </p>
            <Button onClick={retry}>Retry availability</Button>
          </>
        ) : !state.data.enabled ? (
          <>
            <p className="state-panel">
              Submissions are not accepting delivery. Server validation, upload
              limits and abuse controls must be configured and tested before
              enabling this form.
            </p>
            <SubmissionDocuments />
          </>
        ) : reference ? (
          <p role="status">
            The server confirmed receipt. Reference: {reference}. The submission
            awaits private review.
          </p>
        ) : (
          <form
            className="admin-form"
            onSubmit={(e) => {
              e.preventDefault();
              void send();
            }}
          >
            <p>
              Provide only material you have permission to submit. Contact
              details and attachments remain private to authorized staff.
            </p>
            {error && <p role="alert">{error}</p>}
            {(['title', 'excerpt', 'author', 'email', 'outline'] as const).map(
              (k) => (
                <TextField
                  key={k}
                  name={`intake-${k}`}
                  label={
                    {
                      title: 'Article title',
                      excerpt: 'Summary',
                      author: 'Author name',
                      email: 'Contact email',
                      outline: 'Article text',
                    }[k]
                  }
                  value={fields[k]}
                  multiline={k === 'outline' || k === 'excerpt'}
                  max={
                    k === 'outline'
                      ? 6000
                      : k === 'excerpt'
                        ? 1200
                        : k === 'email'
                          ? 254
                          : 180
                  }
                  onChange={(v) => setFields({ ...fields, [k]: v })}
                />
              ),
            )}
            <label>
              Category
              <select
                required
                value={fields.categoryId}
                onChange={(e) =>
                  setFields({ ...fields, categoryId: e.target.value })
                }
              >
                <option value="">Choose category</option>
                {state.data.categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="sr-only" aria-hidden="true">
              Leave this field blank
              <input
                tabIndex={-1}
                autoComplete="off"
                value={fields.website}
                onChange={(e) =>
                  setFields({ ...fields, website: e.target.value })
                }
              />
            </label>
            <label>
              Optional supporting PDF (up to 5 MB)
              <input
                type="file"
                accept="application/pdf"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </label>
            <Captcha key={captchaEpoch} onToken={setToken} />
            <Button type="submit" disabled={busy || !token}>
              {busy ? 'Sending…' : 'Send for private review'}
            </Button>
          </form>
        )}
      </div>
    </PageShell>
  );
}

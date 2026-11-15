import { useEffect, useId, useRef, useState } from 'react';
import { useDemoEnvironment } from '../admin/context';
import { TextField } from '../admin/ui';
import { ErrorToast } from '../admin/error-toast';
import { Button } from '../components/ui';
import type { Asset } from './contracts';
import { actionError, EditorialActionError } from './action-errors';

export function AssetUpload({
  purpose = 'image',
  onSaved,
  onBusyChange,
  onIssue,
}: {
  purpose?: 'image' | 'document';
  onSaved: (asset: Asset) => void;
  onBusyChange?: (busy: boolean) => void;
  onIssue?: (message: string) => void;
}) {
  const env = useDemoEnvironment(),
    id = useId(),
    inFlight = useRef(false);
  const [file, setFile] = useState<File | null>(null),
    [label, setLabel] = useState(''),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [dismissed, setDismissed] = useState(false),
    [preview, setPreview] = useState(''),
    [uploaded, setUploaded] = useState(false),
    [feedback, setFeedback] = useState('');
  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview],
  );
  useEffect(() => {
    if (!feedback) return;
    const timer = setTimeout(() => setFeedback(''), 5000);
    return () => clearTimeout(timer);
  }, [feedback]);
  if (!env.backend) return null;
  async function upload() {
    if (inFlight.current || uploaded) return;
    setDismissed(false);
    if (!file || !label.trim()) {
      const message = !file
        ? `Choose an ${purpose === 'image' ? 'image' : 'PDF'} before uploading.`
        : `${purpose === 'image' ? 'Image description / alt text' : 'Document label'} is required. Add it, then upload.`;
      setError(message);
      onIssue?.(message);
      return;
    }
    inFlight.current = true;
    setBusy(true);
    onBusyChange?.(true);
    setFeedback('');
    try {
      const asset = await env.backend!.upload(file, purpose, label);
      if (!asset.id)
        throw new EditorialActionError(
          'The uploaded cover reference could not be confirmed. Keep the file selected and retry.',
        );
      onSaved(asset);
      setUploaded(true);
      setError('');
      onIssue?.('');
      setFeedback(
        purpose === 'image'
          ? 'Image uploaded and selected as the cover. Save the article or profile to keep this association.'
          : 'PDF uploaded. Attach it to the case to keep this association.',
      );
    } catch (failure) {
      const message = actionError(failure, 'storage').message;
      setError(message);
      onIssue?.(message);
    } finally {
      inFlight.current = false;
      setBusy(false);
      onBusyChange?.(false);
    }
  }
  return (
    <fieldset
      className="admin-fieldset editorial-upload"
      id="coverAssetId"
      tabIndex={-1}
      aria-busy={busy}
    >
      <legend>
        {purpose === 'image'
          ? 'Editorial image upload'
          : 'Supporting PDF upload'}
      </legend>
      <p>
        Choose a file, add its description, then upload.{' '}
        {purpose === 'image'
          ? 'PNG, JPEG or WebP; maximum 3 MB. You can upload before creating the draft. Save the article afterwards to keep its cover.'
          : 'PDF; maximum 10 MB. Attach the uploaded file to the saved case.'}{' '}
        Storage stays private until linked to published content.
      </p>
      <TextField
        name={`asset-label-${purpose}`}
        label={
          purpose === 'image'
            ? 'Image description / alt text'
            : 'Document label'
        }
        value={label}
        onChange={setLabel}
        max={200}
        required={false}
        disabled={busy || uploaded}
        hint="Required for upload. Describe the actual image or document."
        error={error && !label.trim() ? error : undefined}
      />
      <label htmlFor={id}>Choose {purpose}</label>
      <input
        id={id}
        type="file"
        disabled={busy}
        accept={
          purpose === 'image'
            ? 'image/png,image/jpeg,image/webp'
            : 'application/pdf'
        }
        aria-invalid={!!error}
        aria-describedby={`${id}-state`}
        onChange={(event) => {
          const selected = event.target.files?.[0] ?? null;
          setFile(selected);
          setUploaded(false);
          setFeedback('');
          setError('');
          onIssue?.('');
          setPreview(
            selected &&
              ['image/png', 'image/jpeg', 'image/webp'].includes(selected.type)
              ? URL.createObjectURL(selected)
              : '',
          );
        }}
      />
      <div className="editorial-upload-preview">
        <div className="editorial-upload-image">
          {preview ? (
            <img src={preview} alt="Selected image preview" />
          ) : (
            <span>
              {purpose === 'image' ? 'Selected image preview' : 'Selected PDF'}
            </span>
          )}
        </div>
        <div id={`${id}-state`}>
          <p className="editorial-upload-filename">
            {file?.name ?? 'No file selected'}
          </p>
          <p role="status" aria-live="polite">
            {busy
              ? 'Upload pending — keep this page open.'
              : uploaded
                ? 'Uploaded; save or attach to keep the association.'
                : file
                  ? 'Selected locally; ready to upload.'
                  : 'Choose a file to begin.'}
          </p>
          {error && <p className="field-error">{error}</p>}
        </div>
      </div>
      <Button
        type="button"
        variant="secondary"
        disabled={busy || uploaded}
        aria-busy={busy}
        onClick={() => void upload()}
      >
        {busy && (
          <span className="editorial-upload-spinner" aria-hidden="true" />
        )}
        {busy
          ? 'Uploading…'
          : uploaded
            ? 'Uploaded'
            : error
              ? 'Retry upload'
              : 'Upload to restricted storage'}
      </Button>
      <div
        className="editorial-upload-feedback"
        role="status"
        aria-live="polite"
      >
        {feedback}
      </div>
      {error && !dismissed && (
        <ErrorToast message={error} onDismiss={() => setDismissed(true)} />
      )}
    </fieldset>
  );
}

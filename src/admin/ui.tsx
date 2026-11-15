import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Button, Field, Input, Select, Textarea } from '../components/ui';
import { StructuredContent } from '../components/content';
import type { ContentBlock } from '../data/types';
import type { SocialLink } from '../data/site-settings';
import { validateUpload } from '../backend/uploads';

export function ConfirmDialog({
  title,
  children,
  confirmLabel = 'Confirm',
  onConfirm,
  onCancel,
}: {
  title: string;
  children: ReactNode;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const cancel = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const previous =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const element = dialog.current!;
    element.showModal();
    cancel.current?.focus();
    return () => {
      element.close();
      if (previous?.isConnected) previous.focus({ preventScroll: true });
      else
        document.getElementById('main-content')?.focus({ preventScroll: true });
    };
  }, []);
  return (
    <dialog
      ref={dialog}
      className="admin-dialog"
      aria-labelledby="confirmation-title"
      onCancel={(event) => {
        event.preventDefault();
        onCancel();
      }}
    >
      <h2 id="confirmation-title">{title}</h2>
      {children}
      <div className="admin-actions">
        <button
          ref={cancel}
          className="button button-secondary"
          onClick={onCancel}
        >
          Cancel
        </button>
        <Button onClick={onConfirm}>{confirmLabel}</Button>
      </div>
    </dialog>
  );
}

export function TextField({
  name,
  label,
  value,
  onChange,
  multiline = false,
  required = true,
  max = 180,
  error,
  hint,
  disabled,
}: {
  name: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
  required?: boolean;
  max?: number;
  error?: string;
  hint?: string;
  disabled?: boolean;
}) {
  const props = {
    id: name,
    name,
    value,
    required,
    disabled,
    maxLength: max,
    onChange: (
      event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
    ) => onChange(event.target.value),
    'aria-invalid': !!error,
    'aria-describedby':
      [hint ? `${name}-hint` : '', error ? `${name}-error` : '']
        .filter(Boolean)
        .join(' ') || undefined,
  };
  return (
    <Field id={name} label={label} hint={hint} error={error}>
      {multiline ? <Textarea {...props} rows={4} /> : <Input {...props} />}
    </Field>
  );
}

export function StructuredEditor({
  blocks,
  onChange,
}: {
  blocks: ContentBlock[];
  onChange: (blocks: ContentBlock[]) => void;
}) {
  const [preview, setPreview] = useState(false);
  function update(index: number, block: ContentBlock) {
    onChange(blocks.map((item, i) => (i === index ? block : item)));
  }
  function move(index: number, offset: number) {
    const next = [...blocks];
    [next[index], next[index + offset]] = [next[index + offset], next[index]];
    onChange(next);
  }
  return (
    <fieldset id="body" tabIndex={-1} className="admin-fieldset">
      <legend>Structured content</legend>
      <p className="field-hint">
        Plain text blocks only. HTML is displayed as text; scripts and embedded
        content are not supported.
      </p>
      {blocks.map((block, index) => (
        <div className="admin-block" key={index}>
          <Field id={`block-type-${index}`} label={`Block ${index + 1} type`}>
            <Select
              id={`block-type-${index}`}
              value={block.type}
              onChange={(e) => {
                const type = e.target.value as ContentBlock['type'];
                const text =
                  block.type === 'list' ? block.items.join('\n') : block.text;
                update(
                  index,
                  type === 'list'
                    ? { type, items: text.split('\n') }
                    : { type, text },
                );
              }}
            >
              <option value="paragraph">Paragraph</option>
              <option value="heading">Heading</option>
              <option value="list">List</option>
              <option value="note">Note</option>
            </Select>
          </Field>
          <TextField
            name={`block-text-${index}`}
            label={`Block ${index + 1} text`}
            multiline
            max={6000}
            value={block.type === 'list' ? block.items.join('\n') : block.text}
            hint={block.type === 'list' ? 'One item per line.' : undefined}
            onChange={(text) =>
              update(
                index,
                block.type === 'list'
                  ? { type: 'list', items: text.split('\n') }
                  : { type: block.type, text },
              )
            }
          />
          <div className="admin-actions">
            <Button
              type="button"
              variant="secondary"
              disabled={index === 0}
              onClick={() => move(index, -1)}
              aria-label={`Move block ${index + 1} up`}
            >
              ↑ Up
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={index === blocks.length - 1}
              onClick={() => move(index, 1)}
              aria-label={`Move block ${index + 1} down`}
            >
              ↓ Down
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={blocks.length === 1}
              onClick={() => onChange(blocks.filter((_, i) => i !== index))}
            >
              Remove block {index + 1}
            </Button>
          </div>
        </div>
      ))}
      <div className="admin-actions">
        <Button
          type="button"
          variant="secondary"
          disabled={blocks.length >= 80}
          onClick={() => onChange([...blocks, { type: 'paragraph', text: '' }])}
        >
          Add content block
        </Button>
        <Button
          type="button"
          variant="secondary"
          aria-expanded={preview}
          onClick={() => setPreview(!preview)}
        >
          Preview structured content
        </Button>
      </div>
      {preview && (
        <div className="admin-preview">
          <StructuredContent blocks={blocks} />
        </div>
      )}
    </fieldset>
  );
}

export function LinkEditor({
  fictional = true,
  links,
  onChange,
}: {
  fictional?: boolean;
  links: SocialLink[];
  onChange: (links: SocialLink[]) => void;
}) {
  return (
    <fieldset id="links" tabIndex={-1} className="admin-fieldset">
      <legend>{fictional ? 'Sample links' : 'Public links'}</legend>
      <p className="field-hint">
        {fictional
          ? 'Fictional HTTP/HTTPS links only; use example.org. No credentials in URLs.'
          : 'Use approved public HTTP/HTTPS links. Do not include credentials in URLs.'}
      </p>
      {links.map((link, i) => (
        <div className="admin-block" key={i}>
          <TextField
            name={`link-label-${i}`}
            label={`Link ${i + 1} label`}
            max={80}
            value={link.label}
            onChange={(label) =>
              onChange(links.map((l, n) => (n === i ? { ...l, label } : l)))
            }
          />
          <TextField
            name={`link-url-${i}`}
            label={`Link ${i + 1} URL`}
            max={500}
            value={link.url}
            onChange={(url) =>
              onChange(links.map((l, n) => (n === i ? { ...l, url } : l)))
            }
          />
          <Button
            type="button"
            variant="secondary"
            onClick={() => onChange(links.filter((_, n) => i !== n))}
          >
            Remove link {i + 1}
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="secondary"
        disabled={links.length >= 12}
        onClick={() =>
          onChange([
            ...links,
            {
              label: fictional ? 'Sample link' : '',
              url: fictional ? 'https://example.org' : '',
            },
          ])
        }
      >
        {fictional ? 'Add sample link' : 'Add public link'}
      </Button>
    </fieldset>
  );
}

export function LocalImagePreview({
  onSaved,
}: {
  onSaved?: (url: string, alt: string) => void;
}) {
  const [preview, setPreview] = useState('');
  const [error, setError] = useState('');
  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview],
  );
  return (
    <div className="admin-preview">
      <Field
        id="local-image"
        label={
          onSaved
            ? 'Local article cover'
            : 'Local image preview — not uploaded or saved'
        }
        hint={
          onSaved
            ? 'Fictional artwork only. PNG/JPEG/WebP up to 768 KB; stored in this browser after saving the article. No cross-device upload.'
            : 'Fictional artwork only, PNG/JPEG/WebP up to 3 MB. The selected bundled artwork remains the saved cover/avatar.'
        }
      >
        <Input
          id="local-image"
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={async (e) => {
            const input = e.currentTarget;
            const file = e.target.files?.[0];
            setError('');
            setPreview('');
            if (!file) return;
            if (
              !['image/png', 'image/jpeg', 'image/webp'].includes(file.type) ||
              file.size > 3 * 1024 * 1024
            ) {
              setError('Choose a PNG, JPEG or WebP up to 3 MB.');
              e.target.value = '';
              return;
            }
            try {
              await validateUpload(file, 'image');
              if (onSaved) {
                if (file.size > 768 * 1024)
                  throw Error(
                    'Use an image up to 768 KB for browser-local storage.',
                  );
                const url = await new Promise<string>((resolve, reject) => {
                  const reader = new FileReader();
                  reader.onload = () => resolve(String(reader.result));
                  reader.onerror = () =>
                    reject(Error('The cover could not be read.'));
                  reader.readAsDataURL(file);
                });
                onSaved(url, 'Fictional local article cover');
              } else setPreview(URL.createObjectURL(file));
            } catch (error) {
              setError(
                error instanceof Error
                  ? error.message
                  : 'The cover could not be read.',
              );
              input.value = '';
            }
          }}
        />
      </Field>
      {error && <p role="alert">{error}</p>}
      {preview && (
        <>
          <img
            className="admin-local-image"
            src={preview}
            alt="Temporary local artwork preview"
          />
          <p>
            Temporary preview only. This image is not uploaded, persisted or
            displayed on public pages.
          </p>
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              setPreview('');
              const input = document.getElementById(
                'local-image',
              ) as HTMLInputElement | null;
              if (input) input.value = '';
            }}
          >
            Clear preview
          </Button>
        </>
      )}
    </div>
  );
}

export function FictionalConfirmation({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="admin-checkbox">
      <input
        name="fictional-confirmation"
        type="checkbox"
        required
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />{' '}
      I confirm these edits contain fictional demo content only, with no real
      personal information or credentials.
    </label>
  );
}

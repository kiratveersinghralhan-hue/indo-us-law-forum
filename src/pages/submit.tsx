import { SubmissionDocuments } from '../components/submission-documents';
import { useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { siteCopy } from '../config/site-copy';
import { useDemoEnvironment } from '../admin/context';
import { BackendSubmissionForm } from '../backend/submission-form';
import {
  Button,
  Field,
  Input,
  PageIntro,
  PageShell,
  Textarea,
} from '../components/ui';

const fieldLabels = {
  title: 'Sample article title',
  summary: 'Sample summary',
  outline: 'Sample outline',
};
type FormField = keyof typeof fieldLabels;
type Errors = Partial<Record<FormField, string>>;

export function SubmitPage() {
  const env = useDemoEnvironment();
  return env.backend ? <BackendSubmissionForm /> : <MockSubmitForm />;
}
function MockSubmitForm() {
  const form = useRef<HTMLFormElement>(null);
  const [errors, setErrors] = useState<Errors>({});
  const [message, setMessage] = useState('');
  function validate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const next: Errors = {};
    for (const key of Object.keys(fieldLabels) as FormField[]) {
      if (!String(data.get(key) ?? '').trim())
        next[key] = `${fieldLabels[key]} is required.`;
    }
    setErrors(next);
    if (Object.keys(next).length) {
      setMessage('Review the required fields below. Nothing has been sent.');
      const first = Object.keys(next)[0];
      form.current?.querySelector<HTMLElement>(`#${first}`)?.focus();
    } else {
      // No provider call, storage, network request or successful submission state.
      setMessage(
        'Prototype only. The sample fields are filled, but submission is unavailable. Nothing has been sent or saved.',
      );
    }
  }
  return (
    <PageShell>
      <PageIntro
        eyebrow={siteCopy.submit.eyebrow}
        title={siteCopy.submit.title}
      >
        <p>{siteCopy.submit.introduction}</p>
      </PageIntro>
      <div className="container submission-grid bottom-space">
        <aside className="submission-aside">
          <p className="eyebrow">Before you begin</p>
          <h2>{siteCopy.submit.notice}</h2>
          <p>{siteCopy.submit.instructions}</p>
          <p>{siteCopy.submit.privacy}</p>
          <ol className="submission-steps">
            {siteCopy.submit.steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </aside>
        <form
          ref={form}
          noValidate
          autoComplete="off"
          onSubmit={validate}
          className="submission-form"
        >
          <p className="required-note">
            Three text fields required · Sample text only
          </p>
          <Field id="title" label="Sample article title" error={errors.title}>
            <Input
              id="title"
              name="title"
              required
              maxLength={180}
              aria-invalid={!!errors.title}
              aria-describedby={errors.title ? 'title-error' : undefined}
            />
          </Field>
          <Field
            id="summary"
            label="Sample summary"
            hint="A short fictional description for this preview."
            error={errors.summary}
          >
            <Textarea
              id="summary"
              name="summary"
              rows={3}
              required
              maxLength={1200}
              aria-invalid={!!errors.summary}
              aria-describedby={`summary-hint${errors.summary ? ' summary-error' : ''}`}
            />
          </Field>
          <Field id="outline" label="Sample outline" error={errors.outline}>
            <Textarea
              id="outline"
              name="outline"
              rows={6}
              required
              maxLength={5000}
              aria-invalid={!!errors.outline}
              aria-describedby={errors.outline ? 'outline-error' : undefined}
            />
          </Field>
          <SubmissionDocuments />
          <div className="form-actions">
            <Button type="submit">Check required fields</Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                form.current?.reset();
                setErrors({});
                setMessage('');
              }}
            >
              Clear sample text
            </Button>
          </div>
          <p className="form-feedback" role="status" aria-live="polite">
            {message}
          </p>
        </form>
      </div>
    </PageShell>
  );
}

import { useContext, useEffect } from 'react';
import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react';
import { Link } from 'react-router-dom';
import { setPageMetadata } from '../config/seo';
import { useReveal } from '../hooks/use-reveal';
import { siteCopy } from '../config/site-copy';
import { DemoEnvironmentContext } from '../admin/context';

export function Arrow({ diagonal = false }: { diagonal?: boolean }) {
  return (
    <span aria-hidden="true" className="arrow">
      {diagonal ? '↗' : '→'}
    </span>
  );
}
export function Button({
  className = '',
  variant = 'primary',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary';
}) {
  return (
    <button className={`button button-${variant} ${className}`} {...props} />
  );
}
export function ButtonLink({
  to,
  children,
  variant = 'primary',
}: {
  to: string;
  children: ReactNode;
  variant?: 'primary' | 'secondary';
}) {
  return (
    <Link to={to} className={`button button-${variant}`}>
      {children}
      <Arrow />
    </Link>
  );
}
export function TextLink({
  to,
  children,
}: {
  to: string;
  children: ReactNode;
}) {
  return (
    <Link to={to} className="text-link">
      {children}
      <Arrow />
    </Link>
  );
}
export function PageShell({ children }: { children: ReactNode }) {
  const scope = useReveal();
  return <div ref={scope}>{children}</div>;
}
export function PageIntro({
  eyebrow,
  title,
  description,
  imagePath,
  pageType,
  children,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  imagePath?: string;
  pageType?: 'article' | 'website';
  children: ReactNode;
}) {
  useEffect(() => {
    setPageMetadata(title, description, { imagePath, type: pageType });
  }, [title, description, imagePath, pageType]);
  return (
    <header className="page-intro container" data-reveal>
      <p className="eyebrow">{eyebrow}</p>
      <h1>{title}</h1>
      <div className="intro-copy">{children}</div>
    </header>
  );
}
export function SampleNotice({ children }: { children?: ReactNode }) {
  const env = useContext(DemoEnvironmentContext);
  return (
    <aside className="sample-notice">
      <span className="sample-tag">
        {env?.backend ? 'Publication content' : 'Sample content'}
      </span>
      <span>
        {children ??
          (env?.backend
            ? 'Indo-US Law Forum. Backend records require editorial approval before publication; final logo and contact information are pending.'
            : siteCopy.sampleNotice)}
      </span>
    </aside>
  );
}
export function Field({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {hint && (
        <p className="field-hint" id={`${id}-hint`}>
          {hint}
        </p>
      )}
      {children}
      {error && (
        <p className="field-error" id={`${id}-error`}>
          {error}
        </p>
      )}
    </div>
  );
}
export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input className="form-control" {...props} />;
}
export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className="form-control" {...props} />;
}
export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className="form-control" {...props} />;
}

export function LoadingState() {
  const live = !!useContext(DemoEnvironmentContext)?.backend;
  return (
    <div className="state-panel" role="status">
      <span className="eyebrow">Please wait</span>
      <p>{live ? 'Loading publication content…' : 'Loading sample content…'}</p>
    </div>
  );
}
export function EmptyState({
  title,
  description,
  onReset,
}: {
  title?: string;
  description?: string;
  onReset?: () => void;
}) {
  const live = !!useContext(DemoEnvironmentContext)?.backend;
  return (
    <div className="state-panel">
      <h2>
        {title ??
          (live
            ? 'No published records match these filters.'
            : 'No samples match these filters.')}
      </h2>
      <p>{description ?? (onReset
        ? 'Try a different search or reset the filters.'
        : live
          ? 'Approved content will appear here after publication.'
          : 'Content will appear here when available.')}</p>
      {onReset && (
        <Button variant="secondary" onClick={onReset}>
          Reset filters
        </Button>
      )}
    </div>
  );
}
export function ErrorState({ onRetry }: { onRetry?: () => void }) {
  return (
    <div className="state-panel" role="alert">
      <h2>Content could not be loaded.</h2>
      <p>Please try again.</p>
      {onRetry && (
        <Button variant="secondary" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}
export function NotFound({
  type = 'Page',
  to = '/',
  backLabel = 'Back to home',
}: {
  type?: string;
  to?: string;
  backLabel?: string;
}) {
  const live = !!useContext(DemoEnvironmentContext)?.backend;
  return (
    <PageShell>
      <PageIntro eyebrow="404 · Not found" title={`${type} not found`}>
        <p>
          {live
            ? 'This address does not match an available page or published record.'
            : 'This address does not match an available page or sample.'}{' '}
          Check the link or return to the collection.
        </p>
      </PageIntro>
      <div className="container bottom-space">
        <ButtonLink to={to}>{backLabel}</ButtonLink>
      </div>
    </PageShell>
  );
}

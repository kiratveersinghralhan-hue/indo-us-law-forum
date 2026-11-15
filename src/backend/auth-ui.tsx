import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { brand } from '../config/brand';
import { setPageMetadata } from '../config/seo';
import type { ReactNode } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useDemoEnvironment } from '../admin/context';
import { Button, LoadingState } from '../components/ui';
import { ErrorToast } from '../admin/error-toast';
import { authFailure } from './auth-errors';
import { editorialMedia } from '../config/media';
import './auth-ui.css';
export function StaffGate({ children }: { children: ReactNode }) {
  const env = useDemoEnvironment();
  const [error, setError] = useState('');
  useSyncExternalStore(env.subscribe, env.getRevision, env.getRevision);
  if (!env.backend) return children;
  const session = env.backend.getSession();
  if (session.loading) return <LoadingState />;
  if (!session.user) return <Navigate to="/admin/login" replace />;
  if (!session.role)
    return (
      <div className="container state-panel">
        <h1>Staff access unavailable</h1>
        <p>
          {session.error ||
            'This account has no active staff authorization. A project administrator must provision access in the database.'}
        </p>
        {error && <p role="alert">{error}</p>}
        <Button
          onClick={() =>
            void env.backend
              ?.signOut()
              .catch(() => setError('Sign out failed. Please retry.'))
          }
        >
          Sign out
        </Button>
      </div>
    );
  return children;
}

export function StaffLogin({ recovery = false }: { recovery?: boolean }) {
  const env = useDemoEnvironment();
  useSyncExternalStore(env.subscribe, env.getRevision, env.getRevision);
  const pending = useRef(false);
  const [email, setEmail] = useState(''),
    [password, setPassword] = useState(''),
    [reset, setReset] = useState(false),
    [visible, setVisible] = useState(false),
    [busy, setBusy] = useState(false),
    [feedback, setFeedback] = useState(''),
    [error, setError] = useState(''),
    [dismissed, setDismissed] = useState(false),
    [fields, setFields] = useState<Record<string, string>>({});
  useEffect(() => {
    setPageMetadata(
      recovery
        ? 'Staff recovery'
        : reset
          ? 'Password recovery'
          : 'Staff sign-in',
    );
  }, [recovery, reset]);
  if (!env.backend)
    return (
      <div className="container state-panel">
        <h1>Authentication is not enabled in mock mode</h1>
        <Link to="/admin">Open local demo admin</Link>
      </div>
    );
  const session = env.backend.getSession();
  if (!recovery && session.user && !session.loading)
    return <Navigate to="/admin" replace />;
  const title = recovery
    ? 'Reset password'
    : reset
      ? 'Password recovery'
      : 'Staff sign-in';
  const recoveryReady = !recovery || session.recovery;
  async function run() {
    if (pending.current) return;
    const invalid: Record<string, string> = {};
    if (!recovery && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
      invalid.email = 'Enter the email address assigned to your staff account.';
    if ((!reset || recovery) && !password)
      invalid.password = recovery
        ? 'Enter a new password with at least 12 characters.'
        : 'Enter your password to sign in.';
    else if (recovery && password.length < 12)
      invalid.password = `Your password has ${password.length} characters; use at least 12.`;
    setFields(invalid);
    setDismissed(false);
    setFeedback('');
    if (Object.keys(invalid).length) {
      setError(Object.values(invalid)[0]);
      return;
    }
    if (!recoveryReady) {
      setError(
        'Open a valid recovery link in the browser that requested it. You can request a new link from staff sign-in.',
      );
      return;
    }
    pending.current = true;
    setBusy(true);
    try {
      if (recovery) {
        await env.backend!.updatePassword(password);
        setFeedback('Password updated. Return to staff sign-in.');
      } else if (reset) {
        await env.backend!.recover(email.trim());
        setFeedback(
          'If the account is eligible, a recovery email will arrive. Open the link in this browser to continue.',
        );
      } else await env.backend!.signIn(email.trim(), password);
      setError('');
      setFields({});
      setPassword('');
      setVisible(false);
    } catch (failure) {
      const result = authFailure(failure, recovery || reset);
      setError(result.message);
      if (result.field) setFields({ [result.field]: result.message });
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  function changeMode() {
    setReset((value) => !value);
    setError('');
    setFields({});
    setFeedback('');
    setPassword('');
    setVisible(false);
  }
  return (
    <section className="staff-auth container" aria-label="Staff authentication">
      <div className="staff-auth-composition" aria-hidden="true">
        <div className="staff-auth-masthead">
          <span>{brand.name}</span>
          <span>Editorial workspace</span>
        </div>
        <p className="staff-auth-statement">
          A place for
          <br />
          <em>careful thought.</em>
        </p>
        <div className="staff-auth-publications">
          <div className="staff-auth-paper">
            <i />
            <i />
            <i />
            <i />
            <i />
            <i />
            <span>Research. Review. Refine.</span>
          </div>
          <div className="staff-auth-cover staff-auth-cover-back">
            <span>
              Across borders.
              <br />
              In dialogue.
            </span>
            <div className="staff-auth-rule" />
          </div>
          <div className="staff-auth-cover staff-auth-cover-front">
            <span className="staff-auth-cover-kicker">
              {brand.descriptor}
            </span>
            <strong>
              The
              <br />
              Corridor.
            </strong>
            <img src={editorialMedia.institutions.src} alt="" />
            <span className="staff-auth-cover-footer">
              Disputes & transactions
            </span>
          </div>
        </div>
        <div className="staff-auth-composition-footer">
          <span>Ideas, with context.</span>
          <span>{brand.name} / Staff</span>
        </div>
      </div>
      <div className="staff-auth-form-panel">
        <div className="staff-auth-form-header">
          <p className="eyebrow">
            {recovery || reset ? 'Account recovery' : 'Editorial access'}
          </p>
          <h1>{title}</h1>
          <p>
            {recovery
              ? 'Choose a new password for your existing staff account.'
              : reset
                ? 'We’ll help you return to your editorial workspace.'
                : 'Welcome back. Continue your research and editorial work.'}
          </p>
        </div>
        {feedback && (
          <div className="staff-auth-result" role="status" aria-live="polite">
            <span aria-hidden="true">✓</span>
            <div>
              <strong>
                {recovery ? 'Password updated' : 'Check your email'}
              </strong>
              <p>{feedback}</p>
            </div>
          </div>
        )}
        {recovery && !recoveryReady && !feedback && (
          <p className="staff-auth-callout" role="status">
            Open a valid recovery link in the same browser that requested it.
            Access to this page alone cannot change a password.
          </p>
        )}
        <form
          className="staff-auth-form"
          noValidate
          aria-busy={busy}
          onSubmit={(event) => {
            event.preventDefault();
            void run();
          }}
        >
          {!recovery && (
            <div className="staff-auth-field">
              <label htmlFor="staff-email">Email</label>
              <input
                className="input"
                id="staff-email"
                type="email"
                autoComplete="username"
                inputMode="email"
                autoCapitalize="none"
                spellCheck={false}
                maxLength={254}
                value={email}
                disabled={busy}
                required
                aria-invalid={!!fields.email}
                aria-describedby={
                  fields.email ? 'staff-email-error' : undefined
                }
                onChange={(event) => {
                  setEmail(event.target.value);
                  setFields((previous) => ({ ...previous, email: '' }));
                }}
              />
              {fields.email && (
                <p className="field-error" id="staff-email-error">
                  {fields.email}
                </p>
              )}
            </div>
          )}
          {(!reset || recovery) && (
            <div className="staff-auth-field">
              <label htmlFor="staff-password">
                {recovery
                  ? 'New password (at least 12 characters)'
                  : 'Password'}
              </label>
              <div className="staff-auth-password">
                <input
                  className="input"
                  id="staff-password"
                  type={visible ? 'text' : 'password'}
                  autoComplete={recovery ? 'new-password' : 'current-password'}
                  value={password}
                  disabled={busy || !!feedback}
                  required
                  aria-invalid={!!fields.password}
                  aria-describedby={
                    fields.password
                      ? 'staff-password-error'
                      : recovery
                        ? 'staff-password-hint'
                        : undefined
                  }
                  onChange={(event) => {
                    setPassword(event.target.value);
                    setFields((previous) => ({ ...previous, password: '' }));
                  }}
                />
                <button
                  type="button"
                  className="staff-auth-password-toggle"
                  aria-label={visible ? 'Hide password' : 'Show password'}
                  aria-pressed={visible}
                  aria-controls="staff-password"
                  onClick={() => setVisible((value) => !value)}
                >
                  {visible ? 'Hide' : 'Show'}
                </button>
              </div>
              {recovery && (
                <p id="staff-password-hint" className="field-hint">
                  Use at least 12 characters and choose a password you haven’t
                  used for this account.
                </p>
              )}
              {fields.password && (
                <p className="field-error" id="staff-password-error">
                  {fields.password}
                </p>
              )}
            </div>
          )}
          {!recovery && !reset && (
            <button
              type="button"
              className="staff-auth-text-button staff-auth-forgot"
              disabled={busy}
              onClick={changeMode}
            >
              Forgot password?
            </button>
          )}
          <Button
            className="staff-auth-submit"
            disabled={busy || !recoveryReady || (recovery && !!feedback)}
            type="submit"
            aria-busy={busy}
          >
            {busy && (
              <span className="editorial-upload-spinner" aria-hidden="true" />
            )}
            {busy
              ? recovery
                ? 'Updating…'
                : reset
                  ? 'Sending…'
                  : 'Signing in…'
              : recovery
                ? 'Update password'
                : reset
                  ? feedback
                    ? 'Send another recovery email'
                    : 'Request recovery email'
                  : 'Sign in'}
            {!busy && <span aria-hidden="true">↗</span>}
          </Button>
          <span className="staff-auth-live" role="status" aria-live="polite">
            {busy
              ? recovery
                ? 'Password update pending.'
                : reset
                  ? 'Recovery request pending.'
                  : 'Sign-in pending.'
              : ''}
          </span>
        </form>
        {(reset || recovery) &&
          (recovery ? (
            <Link className="staff-auth-text-button" to="/admin/login">
              Return to sign-in
            </Link>
          ) : (
            <button
              type="button"
              className="staff-auth-text-button"
              disabled={busy}
              onClick={changeMode}
            >
              Return to sign-in
            </button>
          ))}
        <p className="staff-auth-access-note">
          Staff accounts are provisioned separately from public team profiles.
          Signing in does not grant editorial permissions.
        </p>
        <Link className="staff-auth-public-link" to="/">
          ← Return to the publication
        </Link>
      </div>
      {error && !dismissed && (
        <ErrorToast message={error} onDismiss={() => setDismissed(true)} />
      )}
    </section>
  );
}

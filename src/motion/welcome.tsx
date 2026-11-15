import { useEffect, useRef, useState } from 'react';
import { siteCopy } from '../config/site-copy';
import { brand } from '../config/brand';
import type { MotionMode } from './use-motion';

export function MotionWelcome({
  systemReduced,
  onChoose,
  onDismiss,
}: {
  systemReduced: boolean;
  onChoose: (mode: MotionMode) => void;
  onDismiss: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const closing = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [exit, setExit] = useState<'full' | 'reduced' | null>(null);
  function close(choice?: MotionMode) {
    if (closing.current) return;
    closing.current = true;
    const complete = () => (choice ? onChoose(choice) : onDismiss());
    const fullExit = choice === 'full' || !systemReduced;
    setExit(fullExit ? 'full' : 'reduced');
    // The timer is also a fail-safe when CSS animation support is unavailable.
    timer.current = setTimeout(complete, fullExit ? 300 : 120);
  }
  useEffect(() => {
    const node = dialog.current;
    if (!node) return;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    try {
      if (typeof node.showModal === 'function') node.showModal();
      else node.setAttribute('open', '');
    } catch {
      node.setAttribute('open', '');
    }
    node.querySelector<HTMLElement>('h2')?.focus({ preventScroll: true });
    return () => {
      clearTimeout(timer.current);
      document.body.style.overflow = overflow;
      if (typeof node.close === 'function' && node.open) node.close();
      const target =
        previous?.isConnected && previous !== document.body
          ? previous
          : document.getElementById('main-content');
      target?.focus({ preventScroll: true });
    };
  }, []);
  return (
    <dialog
      ref={dialog}
      className="motion-welcome"
      data-exit-motion={exit ?? undefined}
      data-phase={exit ? 'exiting' : 'open'}
      data-minimal={systemReduced}
      aria-labelledby="welcome-title"
      aria-describedby="welcome-description welcome-system"
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.preventDefault();
          close();
        }
        if (event.key !== 'Tab') return;
        const buttons = [
          ...event.currentTarget.querySelectorAll<HTMLButtonElement>('button'),
        ];
        const first = buttons[0],
          last = buttons.at(-1);
        if (
          event.shiftKey &&
          (document.activeElement === first ||
            document.activeElement?.tagName === 'H2')
        ) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }}
    >
      <button
        className="welcome-dismiss"
        type="button"
        aria-label="Dismiss experience choice"
        onClick={() => close()}
      >
        ×
      </button>
      <p className="eyebrow">{brand.name} / A reading preference</p>
      <h2 id="welcome-title" tabIndex={-1}>
        {siteCopy.welcome.title}
      </h2>
      <p id="welcome-description">{siteCopy.welcome.description}</p>
      <p id="welcome-system" className="welcome-system">
        {systemReduced
          ? siteCopy.welcome.systemReduced
          : siteCopy.welcome.websiteOnly}
      </p>
      <div className="welcome-actions">
        <button
          className="button button-secondary"
          type="button"
          aria-label={siteCopy.welcome.calm}
          onClick={() => close('reduced')}
        >
          <strong>{siteCopy.welcome.calm}</strong>
          <span>Still covers and a calm, focused reading experience.</span>
        </button>
        <button
          className="button button-secondary"
          type="button"
          aria-label={siteCopy.welcome.full}
          onClick={() => close('full')}
        >
          <strong>{siteCopy.welcome.full}</strong>
          <span>
            Interactive depth, an optional introduction and rotating article
            covers.
          </span>
        </button>
      </div>
      <p className="welcome-foot">{siteCopy.welcome.changeLater}</p>
    </dialog>
  );
}

import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { brand } from '../config/brand';
import { useMotion } from './use-motion';

export const introSessionKey = 'editorial-intro-seen';
let seenInMemory = false;
function seen() {
  if (seenInMemory) return true;
  try {
    return sessionStorage.getItem(introSessionKey) === '1';
  } catch {
    return seenInMemory;
  }
}

// This is a short, nonmodal visual layer. It never changes body overflow,
// captures navigation, or waits for the decorative renderer.
export function EditorialIntroGate() {
  const { mode, welcomeOpen } = useMotion();
  const { pathname } = useLocation();
  return pathname === '/' && mode === 'full' && !welcomeOpen ? (
    <EditorialIntro />
  ) : null;
}
function EditorialIntro() {
  const [active, setActive] = useState(() => !seen());
  const root = useRef<HTMLDivElement>(null);
  const prior = useRef<HTMLElement | null>(null);
  const finish = useCallback(() => {
    if (root.current?.contains(document.activeElement)) {
      const target =
        prior.current?.isConnected && prior.current !== document.body
          ? prior.current
          : document.getElementById('main-content');
      target?.focus({ preventScroll: true });
    }
    setActive(false);
  }, []);
  useEffect(() => {
    if (!active) return;
    prior.current = document.activeElement as HTMLElement | null;
    seenInMemory = true;
    try {
      sessionStorage.setItem(introSessionKey, '1');
    } catch {
      /* Memory remains session-local. */
    }
    const timer = setTimeout(finish, 2050);
    const key = (event: KeyboardEvent) => {
      if (event.key === 'Escape') finish();
    };
    window.addEventListener('keydown', key);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('keydown', key);
    };
  }, [active, finish]);
  if (!active) return null;
  return (
    <div
      ref={root}
      className="editorial-intro"
      role="region"
      aria-label="Editorial intro"
    >
      <div className="intro-edition" aria-hidden="true">
        <span className="intro-stele" />
        <span className="intro-fine-line" />
        <p className="eyebrow">Student research · India–US</p>
        <div className="intro-type-mask">
          <p className="intro-identity">{brand.name}</p>
        </div>
        <p className="intro-caption">Research · Writing · Perspective</p>
        <span className="intro-fine-line" />
      </div>
      <button type="button" className="intro-skip" onClick={finish}>
        Skip intro <span aria-hidden="true">→</span>
      </button>
      <p className="sr-only">
        A brief optional introduction. Press Escape or Skip intro to continue
        immediately.
      </p>
    </div>
  );
}

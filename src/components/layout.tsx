import { Component, useEffect, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { safeLink } from '../data/safe-link';
import { brand } from '../config/brand';
import { navigation, paths } from '../config/navigation';
import { Arrow, ErrorState } from './ui';
import { useMotion } from '../motion/use-motion';
import { siteCopy } from '../config/site-copy';
import { EditorialIntroGate } from '../motion/editorial-intro';
import { usePublicSite } from '../data/site-context';
import { useDemoEnvironment } from '../admin/context';

// Below this width the primary navigation is an off-canvas drawer.
const drawerQuery = '(max-width: 1080px)';

function Header() {
  const [open, setOpen] = useState(false);
  const header = useRef<HTMLElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  const nav = useRef<HTMLElement>(null);
  const close = (restoreFocus = false) => {
    setOpen(false);
    if (restoreFocus) toggle.current?.focus();
  };
  // Share the measured header height with anchor and sticky-section offsets.
  useEffect(() => {
    const element = header.current;
    if (!element) return;
    const root = document.documentElement;
    const previous = root.style.getPropertyValue('--public-header-height');
    const measure = () =>
      root.style.setProperty(
        '--public-header-height',
        `${element.getBoundingClientRect().height}px`,
      );
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => {
      observer.disconnect();
      if (previous) root.style.setProperty('--public-header-height', previous);
      else root.style.removeProperty('--public-header-height');
    };
  }, []);
  // Scroll lock while the drawer is open; compensates for a desktop scrollbar
  // so the page never shifts. Restored on close, route change and unmount.
  useEffect(() => {
    if (!open) return;
    const root = document.documentElement;
    const gap = window.innerWidth - root.clientWidth;
    const previous = {
      overflow: root.style.overflow,
      paddingRight: root.style.paddingRight,
    };
    root.style.overflow = 'hidden';
    if (gap > 0) root.style.paddingRight = `${gap}px`;
    root.dataset.navOpen = 'true';
    // Isolate background controls without changing their existing inert state.
    const outside = new Set<HTMLElement>();
    const brand = header.current?.querySelector<HTMLElement>('.brand');
    if (brand) outside.add(brand);
    let branch: HTMLElement | null = header.current;
    while (branch?.parentElement && branch.id !== 'root') {
      for (const sibling of branch.parentElement.children) {
        if (sibling !== branch && sibling instanceof HTMLElement)
          outside.add(sibling);
      }
      branch = branch.parentElement;
    }
    const priorInert = [...outside].map(
      (element) => [element, element.inert] as const,
    );
    for (const [element] of priorInert) element.inert = true;
    // Focus moves at once; the reveal animation never delays interaction.
    nav.current
      ?.querySelector<HTMLElement>('a')
      ?.focus({ preventScroll: true });
    const media = window.matchMedia(drawerQuery);
    const leaveDrawer = () => !media.matches && setOpen(false);
    media.addEventListener('change', leaveDrawer);
    return () => {
      for (const [element, inert] of priorInert) element.inert = inert;
      root.style.overflow = previous.overflow;
      root.style.paddingRight = previous.paddingRight;
      delete root.dataset.navOpen;
      media.removeEventListener('change', leaveDrawer);
    };
  }, [open]);
  function keyDown(event: React.KeyboardEvent) {
    if (!open) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      close(true);
      return;
    }
    if (event.key !== 'Tab' || !nav.current) return;
    // Keep keyboard focus inside the open drawer and its close control.
    const focusable = [
      toggle.current,
      ...nav.current.querySelectorAll<HTMLElement>('a[href]'),
    ].filter(Boolean) as HTMLElement[];
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }
  return (
    <header
      id="site-menu"
      ref={header}
      role={open ? 'dialog' : undefined}
      aria-modal={open || undefined}
      aria-label={open ? 'Site menu' : undefined}
      className={`site-header ${open ? 'nav-is-open' : ''}`}
      onKeyDown={keyDown}
    >
      <div className="header-inner container">
        <Link
          to={paths.home}
          className="brand"
          aria-label={`${brand.name} — Home`}
        >
          <span>
            {brand.name}
            <small>{brand.descriptor}</small>
          </span>
        </Link>
        <button
          ref={toggle}
          className="menu-toggle"
          type="button"
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-controls="site-menu"
          aria-label={open ? 'Close menu' : 'Open menu'}
          onClick={() => setOpen(!open)}
        >
          <span className="menu-toggle-lines" aria-hidden="true">
            <span />
            <span />
          </span>
        </button>
        <div
          className="nav-backdrop"
          aria-hidden="true"
          onClick={() => close(true)}
        />
        <nav
          ref={nav}
          id="primary-navigation"
          aria-label="Primary"
          className={`primary-nav ${open ? 'is-open' : ''}`}
        >
          <p className="nav-drawer-label" aria-hidden="true">
            Menu
          </p>
          {navigation.map((item, index) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              onClick={() => close()}
              style={{ '--i': index } as CSSProperties}
            >
              <span className="nav-index" aria-hidden="true">
                {String(index + 1).padStart(2, '0')}
              </span>
              {item.label}
            </NavLink>
          ))}
          <NavLink
            to={paths.submit}
            className="nav-submit"
            onClick={() => close()}
            style={{ '--i': navigation.length } as CSSProperties}
          >
            Submit an article <Arrow diagonal />
          </NavLink>
        </nav>
      </div>
    </header>
  );
}
function Footer() {
  const live = !!useDemoEnvironment().backend;
  const settings = usePublicSite();
  const { openWelcome } = useMotion();
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-top">
          <div>
            <p className="eyebrow">{siteCopy.footer.eyebrow}</p>
            <p className="footer-statement">
              {siteCopy.footer.lineOne}
              <br />
              <em>{siteCopy.footer.lineTwo}</em>
            </p>
            <p className="footer-description">{siteCopy.footer.description}</p>
          </div>
          <div>
            <p className="eyebrow">Explore</p>
            <nav aria-label="Footer" className="footer-nav">
              {navigation.map((item) => (
                <Link key={item.to} to={item.to}>
                  {item.label}
                </Link>
              ))}
              <Link to={paths.submit}>Submit an article</Link>
              <Link to={paths.admin}>
                {live ? 'Staff administration' : 'Admin prototype'}
              </Link>
            </nav>
          </div>
          <div className="footer-note">
            <p className="eyebrow">Current edition</p>
            <p>
              {live
                ? 'Connected editorial preview'
                : 'Public frontend prototype'}
            </p>
            <p>
              {live ? 'Published records only.' : 'Sample content only.'}
              <br />
              Submissions are not accepting delivery.
            </p>
            {settings.contact.email && (
              <p>
                <a href={`mailto:${settings.contact.email}`}>
                  {settings.contact.email}
                </a>
              </p>
            )}
            {settings.contact.address && <p>{settings.contact.address}</p>}
            {settings.socialLinks
              .filter((link) => safeLink(link.url))
              .map((link) => (
                <p key={link.url}>
                  <a href={safeLink(link.url)} rel="noopener noreferrer">
                    {link.label}
                  </a>
                </p>
              ))}
          </div>
        </div>
        <div className="footer-bottom">
          <span>{brand.name}</span>
          <button
            id="experience-settings"
            type="button"
            className="experience-settings"
            onClick={openWelcome}
          >
            Experience settings
          </button>
          <span>
            {live
              ? 'Local preview'
              : 'Approved content pending · Local prototype'}
          </span>
        </div>
      </div>
    </footer>
  );
}
export class AppErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <div className="container bottom-space">
        <ErrorState />
        <button
          className="button button-secondary"
          onClick={() => window.location.reload()}
        >
          Reload page
        </button>
      </div>
    ) : (
      this.props.children
    );
  }
}
export function Layout() {
  const live = !!useDemoEnvironment().backend;
  const location = useLocation();
  const main = useRef<HTMLElement>(null);
  const previousPath = useRef(location.pathname);
  useEffect(() => {
    if (previousPath.current !== location.pathname) {
      window.scrollTo({ top: 0, behavior: 'instant' });
      main.current?.focus({ preventScroll: true });
      previousPath.current = location.pathname;
    }
  }, [location.pathname]);
  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <EditorialIntroGate />
      <div className="prototype-banner">
        {live ? `${brand.name} / Student research` : brand.prototypeNotice}
      </div>
      <Header key={location.pathname} />
      <main ref={main} id="main-content" tabIndex={-1}>
        <AppErrorBoundary key={location.pathname}>
          <div key={location.pathname} className="route-view">
            <Outlet />
          </div>
        </AppErrorBoundary>
      </main>
      <Footer />
    </>
  );
}

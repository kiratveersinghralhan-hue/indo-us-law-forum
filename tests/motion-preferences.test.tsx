// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import {
  MotionPreferences,
  welcomeDismissedKey,
  motionChoiceKey,
} from '../src/motion/preferences';
import { useMotion, motionPreferenceKey } from '../src/motion/use-motion';
import { HeroArtwork } from '../src/motion/hero-artwork';
import { sampleArticles } from '../src/data/mock-data';
vi.mock('../src/motion/webgl-scene', () => ({
  default: ({
    reduced,
    finePointer,
  }: {
    reduced: boolean;
    finePointer: boolean;
  }) => (
    <div
      data-testid="scene"
      data-reduced={String(reduced)}
      data-pointer={String(finePointer)}
    />
  ),
}));
let systemReduced = false;
beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  systemReduced = false;
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: query.includes('prefers-reduced-motion') ? systemReduced : false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
function Reader() {
  const motion = useMotion();
  return (
    <>
      <main id="main-content" tabIndex={-1}>
        <output data-testid="effective">
          {motion.reduced ? 'plain' : 'full'}
        </output>
        <HeroArtwork articles={sampleArticles.slice(0, 3)} />
      </main>
      <button onClick={motion.openWelcome}>Experience settings</button>
    </>
  );
}
const mount = () =>
  render(
    <MemoryRouter>
      <MotionPreferences>
        <Reader />
      </MotionPreferences>
    </MemoryRouter>,
  );
async function choose(name: string) {
  fireEvent.click(screen.getByRole('button', { name }));
  expect(screen.getByRole('dialog').getAttribute('data-phase')).toBe('exiting');
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
}
describe('two-choice reading preference', () => {
  it('keeps fresh visitors Plain without persisting an implicit preference; restores scroll locking after exit', async () => {
    mount();
    expect(
      screen.getByRole('heading', { name: 'How would you like to explore?' }),
    ).toBeTruthy();
    expect(screen.getByTestId('effective').textContent).toBe('plain');
    expect(localStorage.getItem(motionPreferenceKey)).toBeNull();
    expect(document.body.style.overflow).toBe('hidden');
    await choose('Plain website');
    // The dialog's passive-effect cleanup can follow its DOM removal.
    await waitFor(() => expect(document.body.style.overflow).toBe(''));
    expect(localStorage.getItem(motionPreferenceKey)).toBe('reduced');
  });
  it('requires an explicit Full choice even under OS reduction and remembers it', async () => {
    systemReduced = true;
    const first = mount();
    expect(screen.getByRole('dialog').getAttribute('data-minimal')).toBe(
      'true',
    );
    await choose('Experience full motion');
    expect(screen.getByTestId('effective').textContent).toBe('full');
    expect(localStorage.getItem(motionChoiceKey)).toBe('1');
    first.unmount();
    mount();
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByTestId('effective').textContent).toBe('full');
  });
  it('reopens from the footer, suppresses motion while choosing, restores focus to its trigger', async () => {
    localStorage.setItem(motionPreferenceKey, 'full');
    mount();
    const trigger = screen.getByRole('button', { name: 'Experience settings' });
    trigger.focus();
    fireEvent.click(trigger);
    expect(screen.getByTestId('effective').textContent).toBe('plain');
    await choose('Plain website');
    expect(document.activeElement).toBe(trigger);
    expect(document.body.style.overflow).toBe('');
  });
  it('dismisses to Plain for the session even when a prior Full preference exists', async () => {
    localStorage.setItem(motionPreferenceKey, 'full');
    const first = mount();
    fireEvent.click(
      screen.getByRole('button', { name: 'Experience settings' }),
    );
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(sessionStorage.getItem(welcomeDismissedKey)).toBe('1');
    expect(localStorage.getItem(motionPreferenceKey)).toBe('full');
    first.unmount();
    mount();
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByTestId('effective').textContent).toBe('plain');
  });
  it.each(['reduced', 'full', 'system'])(
    'migrates legacy explicit %s safely',
    (mode) => {
      localStorage.setItem(motionPreferenceKey, mode);
      localStorage.setItem(motionChoiceKey, '1');
      mount();
      expect(screen.queryByRole('dialog')).toBeNull();
      expect(screen.getByTestId('effective').textContent).toBe(
        mode === 'full' ? 'full' : 'plain',
      );
    },
  );
  it('asks legacy automatically stored System visitors to choose', () => {
    localStorage.setItem(motionPreferenceKey, 'system');
    mount();
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(screen.getByTestId('effective').textContent).toBe('plain');
  });
  it('storage failures preserve a working Plain choice and clean up a mounted dialog', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw Error('blocked');
    });
    const first = mount();
    await choose('Plain website');
    expect(screen.getByTestId('effective').textContent).toBe('plain');
    first.unmount();
    const second = mount();
    second.unmount();
    expect(document.body.style.overflow).toBe('');
  });
});

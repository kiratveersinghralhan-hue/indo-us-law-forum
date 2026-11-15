// Development test entry only. Not a Vite build entry and never imported by the app.
// The connected browser prefers reduced motion; this fixture tests no-preference
// without altering the user's OS settings or weakening the product's policy.
const params = new URLSearchParams(location.search);
const originalMatchMedia = window.matchMedia.bind(window);
window.matchMedia = (query) =>
  originalMatchMedia(
    query
      .replaceAll('(prefers-reduced-motion: no-preference)', '(min-width: 0px)')
      .replaceAll('(prefers-reduced-motion: reduce)', '(max-width: 0px)'),
  );
if (params.get('webgl') === 'unavailable') {
  const original = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (
    this: HTMLCanvasElement,
    ...args: Parameters<typeof original>
  ) {
    if (String(args[0]).includes('webgl')) return null;
    return original.apply(this, args);
  } as typeof original;
}
history.replaceState(null, '', '/');
await import('../src/main');
const toolbar = document.createElement('aside');
toolbar.setAttribute('aria-label', 'Local QA controls');
toolbar.style.cssText =
  'position:fixed;bottom:8px;left:8px;z-index:100;background:#f7f5ef;padding:8px;border:1px solid #85493e;font-size:11px;display:flex;gap:8px';
const label = document.createElement('span');
label.textContent = 'Development QA fixture';
toolbar.append(label);
function control(label: string, action: () => void) {
  const button = document.createElement('button');
  button.textContent = label;
  button.onclick = action;
  toolbar.append(button);
}
control('Lose WebGL context', () => {
  const gl = document.querySelector('canvas')?.getContext('webgl2');
  gl?.getExtension('WEBGL_lose_context')?.loseContext();
});
control('Preview pointer movement', () => {
  const host = document.querySelector('.sculpture-webgl');
  const bounds = host?.getBoundingClientRect();
  if (host && bounds)
    host.dispatchEvent(
      new PointerEvent('pointermove', {
        clientX: bounds.right - 20,
        clientY: bounds.top + 20,
      }),
    );
  const card = document.querySelector('.article-card');
  const rect = card?.getBoundingClientRect();
  if (card && rect)
    card.dispatchEvent(
      new PointerEvent('pointermove', {
        clientX: rect.right - 20,
        clientY: rect.top + 20,
      }),
    );
});
document.body.append(toolbar);
export {};

import { brand } from './brand';

export const defaultDescription =
  'Indo-US Law Forum is a research wing of student researchers exploring India–US cross-border disputes and transactions, with articles and student contributions.';
export function setPageMetadata(
  title: string,
  description = defaultDescription,
  options: { type?: 'article' | 'website'; imagePath?: string } = {},
) {
  document.title = `${title} · ${brand.name}`;
  const canonical = document.head.querySelector<HTMLLinkElement>(
    'link[rel="canonical"]',
  );
  // Only the configured HTTP renderer supplies a canonical origin. Ordinary
  // Vite/mock mode must not invent the future production domain.
  const origin = canonical ? new URL(canonical.href).origin : undefined;
  if (canonical && origin)
    canonical.href = new URL(window.location.pathname, origin).href;
  const image =
    origin && options.imagePath
      ? new URL(options.imagePath, origin).href
      : undefined;
  if (!image)
    document.head.querySelector('meta[property="og:image"]')?.remove();
  for (const [attribute, key, content] of [
    ['name', 'description', description],
    ['property', 'og:title', document.title],
    ['property', 'og:description', description],
    ['property', 'og:type', options.type ?? 'website'],
    ['name', 'twitter:card', image ? 'summary_large_image' : 'summary'],
    ...(canonical ? [['property', 'og:url', canonical.href]] : []),
    ...(image ? [['property', 'og:image', image]] : []),
  ]) {
    let node = document.head.querySelector<HTMLMetaElement>(
      `meta[${attribute}="${key}"]`,
    );
    if (!node) {
      node = document.createElement('meta');
      node.setAttribute(attribute, key);
      document.head.append(node);
    }
    node.content = content;
  }
}

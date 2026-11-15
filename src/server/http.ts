import { createServer } from 'node:http';
import type { ServerResponse } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import type { WebsiteEnvironment } from '../backend/contracts';
import { renderPublic, sitemap, escapeHTML, serializeSeed } from './render';
import { dedicatedSupabaseOrigin, responseSecurity } from './security-headers';

export function createPublicationServer(options: {
  origin: string;
  root: string;
  template: string;
  indexable?: boolean;
  environment: () => Promise<WebsiteEnvironment>;
  supabaseOrigin?: string;
}) {
  const { origin, root, template, indexable = false } = options;
  const backendOrigin = options.supabaseOrigin ?? dedicatedSupabaseOrigin;
  responseSecurity(backendOrigin); // Validate configuration before listening.
  const mime: Record<string, string> = {
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.webp': 'image/webp',
    '.jpg': 'image/jpeg',
    '.woff2': 'font/woff2',
    '.ico': 'image/x-icon',
  };
  const noStore = {
    'Cache-Control': 'private, no-store',
  };
  const send = (
    response: ServerResponse,
    status: number,
    type: string,
    body: string | Buffer | undefined,
    headers: Record<string, string> = {},
  ) => {
    response.writeHead(status, {
      ...noStore,
      'Content-Type': type,
      ...headers,
    });
    response.end(body);
  };
  const server = createServer(async (request, response) => {
    const { nonce, headers: security } = responseSecurity(backendOrigin);
    for (const [name, value] of Object.entries(security))
      response.setHeader(name, value);
    // Review/local responses, including sitemap, images and early errors.
    if (!indexable) response.setHeader('X-Robots-Tag', 'noindex, nofollow');
    // Only the trusted build template receives script nonces, never rendered content.
    const shell = template.replace(/<script\b/g, `<script nonce="${nonce}"`);
    let environment: WebsiteEnvironment | undefined;
    try {
      if (!['GET', 'HEAD'].includes(request.method ?? ''))
        return send(response, 405, 'text/plain', 'Method unavailable.', {
          Allow: 'GET, HEAD',
        });
      const incoming = new URL(request.url ?? '/', origin);
      // A protocol-relative/absolute request target cannot choose the canonical origin.
      const target = new URL(incoming.pathname + incoming.search, origin);
      const path = decodeURIComponent(target.pathname);
      // Ignore cookies/Authorization: this renderer can read only anonymous public rows.
      if (
        path.startsWith('/assets/') ||
        path.startsWith('/artwork/') ||
        path.startsWith('/fonts/') ||
        path === '/favicon.svg'
      ) {
        const file = resolve(root, '.' + path);
        if (
          !file.startsWith(root + sep) ||
          !(await stat(file).catch(() => null))?.isFile()
        )
          return send(response, 404, 'text/plain', 'Not found.');
        return send(
          response,
          200,
          mime[extname(file)] ?? 'application/octet-stream',
          request.method === 'HEAD' ? undefined : await readFile(file),
        );
      }
      if (path === '/admin' || path.startsWith('/admin/'))
        return send(
          response,
          200,
          'text/html; charset=utf-8',
          request.method === 'HEAD' ? undefined : shell,
          { 'X-Robots-Tag': 'noindex, nofollow' },
        );
      if (path === '/robots.txt')
        return send(
          response,
          200,
          'text/plain',
          indexable
            ? `User-agent: *\nDisallow: /admin\nDisallow: /submit\nSitemap: ${origin}/sitemap.xml\n`
            : 'User-agent: *\nDisallow: /\n',
        );
      environment = await options.environment();
      if (path === '/sitemap.xml')
        return send(
          response,
          200,
          'application/xml; charset=utf-8',
          await sitemap(environment, origin),
        );
      if (path.startsWith('/media/')) {
        const id = path.slice('/media/'.length);
        if (!/^[0-9a-f-]{36}$/i.test(id))
          return send(response, 404, 'text/plain', 'Not found.');
        const client = environment.backend!.client;
        const asset = await client
          .from('editorial_assets')
          .select('path,bucket,mime')
          .eq('id', id)
          .maybeSingle();
        if (asset.error) throw Error('Image lookup failed.');
        if (
          !asset.data ||
          asset.data.bucket !== 'editorial-images' ||
          !['image/png', 'image/jpeg', 'image/webp'].includes(asset.data.mime)
        )
          return send(response, 404, 'text/plain', 'Not found.');
        const object = await client.storage
          .from(asset.data.bucket)
          .download(asset.data.path);
        if (object.error) {
          if (
            ['400', '403', '404'].includes(
              String((object.error as { statusCode?: string }).statusCode),
            )
          )
            return send(response, 404, 'text/plain', 'Not found.');
          throw Error('Image download unavailable.');
        }
        return send(
          response,
          200,
          asset.data.mime,
          request.method === 'HEAD'
            ? undefined
            : Buffer.from(await object.data.arrayBuffer()),
        );
      }
      const result = await renderPublic(target.href, environment);
      const canonical = new URL(target.pathname, origin).href;
      const robots =
        indexable &&
        result.status === 200 &&
        !target.search &&
        path !== '/submit'
          ? 'index, follow'
          : 'noindex, nofollow';
      const metadata = `<title>${escapeHTML(result.title)}</title><meta name="description" content="${escapeHTML(result.description)}"><meta name="robots" content="${robots}"><link rel="canonical" href="${escapeHTML(canonical)}"><meta property="og:title" content="${escapeHTML(result.title)}"><meta property="og:description" content="${escapeHTML(result.description)}"><meta property="og:url" content="${escapeHTML(canonical)}"><meta property="og:type" content="${path.startsWith('/articles/') ? 'article' : 'website'}"><meta name="twitter:card" content="${result.imagePath ? 'summary_large_image' : 'summary'}">${result.imagePath ? `<meta property="og:image" content="${escapeHTML(new URL(result.imagePath, origin).href)}">` : ''}`;
      const html = shell
        .replace(/<title>[\s\S]*?<\/title>/, '')
        .replace(/<meta name="(?:description|robots)"[^>]*>/g, '')
        .replace('</head>', metadata + '</head>')
        .replace(
          '<div id="root"></div>',
          `<div id="root">${result.markup}</div><script nonce="${nonce}" type="application/json" id="public-resource-seed">${serializeSeed(result.seed)}</script>`,
        );
      send(
        response,
        result.status,
        'text/html; charset=utf-8',
        request.method === 'HEAD' ? undefined : html,
        { 'X-Robots-Tag': robots },
      );
    } catch {
      // Backend failure is a 503, never a fabricated 404 or sample-content fallback.
      send(
        response,
        503,
        'text/html; charset=utf-8',
        '<!doctype html><meta name="robots" content="noindex"><h1>Publication temporarily unavailable</h1><p>Please retry later.</p>',
        { 'X-Robots-Tag': 'noindex, nofollow' },
      );
    } finally {
      environment?.dispose?.();
    }
  });

  return server;
}

/**
 * robots.txt and sitemap.xml for the public site. Only pages that anyone can open without
 * a session are listed; learner work, administration and the API stay out of search indexes.
 */

/** Public pages of the web app that do not depend on stored learner work. */
export const PUBLIC_PAGES = [
  '/nauka',
  '/arkusze',
  '/teoria',
  '/faq',
  '/jak-wyglada-egzamin',
  '/co-nowego',
  '/nauka/podstawy',
  '/nauka/podrecznik',
  '/nauka/podrecznik/html',
  '/nauka/podrecznik/css',
  '/nauka/podrecznik/javascript',
  '/nauka/podrecznik/sql',
  '/nauka/podrecznik/php',
] as const;

const PRIVATE_PREFIXES = ['/api/', '/admin', '/moje-prace', '/postepy'] as const;

function base(origin: string) {
  return new URL(origin).origin;
}

export function robotsTxt(origin: string) {
  return [
    'User-agent: *',
    ...PRIVATE_PREFIXES.map((prefix) => `Disallow: ${prefix}`),
    '',
    `Sitemap: ${base(origin)}/sitemap.xml`,
    '',
  ].join('\n');
}

function escapeXml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

/** Each published course opens at its learning view, the canonical address of a paper. */
export function sitemapXml(origin: string, taskIds: readonly string[]) {
  const root = base(origin);
  const paths = [
    ...PUBLIC_PAGES,
    ...[...new Set(taskIds)].sort().map((id) => `/praktyka/${encodeURIComponent(id)}`),
  ];
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...paths.map((path) => `  <url><loc>${escapeXml(root + path)}</loc></url>`),
    '</urlset>',
    '',
  ].join('\n');
}

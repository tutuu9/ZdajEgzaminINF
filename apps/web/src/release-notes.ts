/**
 * Learner-facing release history built from docs/releases/v*.md. Only the Polish summary and
 * its bullet list are shown; deployment and verification paragraphs stay in the documents.
 */
export interface ReleaseSummary {
  version: string;
  title: string;
  intro: string;
  items: string[];
}

/** Versions that were prepared but never published; their changes belong to a later release. */
const UNPUBLISHED = new Set(['1.6.0']);
const SITE_ORIGIN = 'https://zdajegzamin.sbs';

function versionOf(fileName: string) {
  return /v(\d+\.\d+\.\d+)\.md$/.exec(fileName)?.[1];
}

function compareVersions(a: string, b: string) {
  const left = a.split('.').map(Number);
  const right = b.split('.').map(Number);
  for (let index = 0; index < 3; index++) {
    const difference = (left[index] ?? 0) - (right[index] ?? 0);
    if (difference) return difference;
  }
  return 0;
}

/** Absolute links to this site become in-app paths, so they open without a page reload. */
export function localHref(href: string) {
  if (!href.startsWith(SITE_ORIGIN)) return undefined;
  const path = href.slice(SITE_ORIGIN.length);
  if (path === '') return '/';
  return path.startsWith('/') ? path : undefined;
}

export function parseRelease(fileName: string, raw: string): ReleaseSummary | undefined {
  const version = versionOf(fileName);
  if (!version) return undefined;
  const lines = raw.replace(/\r\n/g, '\n').split('\n');
  const heading = lines[0]?.match(/^#\s+(.+)$/)?.[1] ?? '';
  const title = heading.includes(' — ') ? heading.slice(heading.indexOf(' — ') + 3) : heading;
  const start = lines.findIndex((line) => line.trim() === '## Polski');
  if (start < 0 || !title) return undefined;
  const section: string[] = [];
  for (const line of lines.slice(start + 1)) {
    if (/^##\s/.test(line)) break;
    section.push(line);
  }
  const blocks = section
    .join('\n')
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean);
  const intro = blocks.find((block) => !block.startsWith('- ')) ?? '';
  const list = blocks.find((block) => block.startsWith('- ')) ?? '';
  const items = list
    .split(/\n(?=- )/)
    .map((item) =>
      item
        .replace(/^- /, '')
        .replace(/\s*\n\s*/g, ' ')
        .trim(),
    )
    .filter(Boolean);
  if (!intro && items.length === 0) return undefined;
  return { version, title, intro, items };
}

/** Newest first, without unpublished versions. */
export function releaseHistory(files: Record<string, string>) {
  return Object.entries(files)
    .map(([fileName, raw]) => parseRelease(fileName, raw))
    .filter((release): release is ReleaseSummary => Boolean(release))
    .filter((release) => !UNPUBLISHED.has(release.version))
    .sort((a, b) => compareVersions(b.version, a.version));
}

export type InlinePart =
  | { kind: 'text'; text: string }
  | { kind: 'strong'; text: string }
  | { kind: 'code'; text: string }
  | { kind: 'link'; text: string; href: string };

/** The small Markdown subset used in release notes: **bold**, `code` and [text](url). */
export function inlineParts(text: string): InlinePart[] {
  const parts: InlinePart[] = [];
  const pattern = /\*\*([^*]+)\*\*|`([^`]+)`|\[([^\]]+)\]\(([^)\s]+)\)/g;
  let last = 0;
  for (const match of text.matchAll(pattern)) {
    const index = match.index ?? 0;
    if (index > last) parts.push({ kind: 'text', text: text.slice(last, index) });
    if (match[1] !== undefined) parts.push({ kind: 'strong', text: match[1] });
    else if (match[2] !== undefined) parts.push({ kind: 'code', text: match[2] });
    else parts.push({ kind: 'link', text: match[3]!, href: match[4]! });
    last = index + match[0].length;
  }
  if (last < text.length) parts.push({ kind: 'text', text: text.slice(last) });
  return parts;
}

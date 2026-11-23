import {
  isRunParameterList,
  MAX_RUN_FIELDS,
  MAX_RUN_FIELD_CHARACTERS,
  type SandboxRunRequest,
} from '@zdaj/shared';

type PageRequest = NonNullable<SandboxRunRequest['php']>;
type Action =
  | { kind: 'link'; address: string }
  | { kind: 'form'; address: string; method: PageRequest['method']; fields: PageRequest['fields'] }
  | { kind: 'unsupported' }
  | { kind: 'limit' };

const messageType = 'zdaj-php-action';
const projectOrigin = 'https://project.invalid';
const maxMarkupLength = 512 * 1024;
const invalidAddress =
  'Wskaż odnośnik lub formularz prowadzący do strony PHP lub HTML w projekcie.';
const fieldLimit = 'Adres i formularz mogą zawierać łącznie do 20 pól po 2000 znaków.';

/** Keep authored destinations as data. Native navigation stays blocked in the preview. */
export function preparePhpPreview(root: Element) {
  // The preview has already inlined project stylesheets. Drop remaining resource hints.
  root.querySelectorAll('link').forEach((link) => link.remove());
  for (const link of root.querySelectorAll('a,area')) {
    const address = link.getAttribute('href') ?? link.getAttribute('xlink:href');
    link.removeAttribute('data-run-href');
    for (const name of ['xlink:href', 'target', 'download', 'ping']) link.removeAttribute(name);
    if (address !== null) {
      link.setAttribute('data-run-href', address);
      link.setAttribute('href', '#');
    }
  }
  for (const element of root.querySelectorAll('form,button,input')) {
    for (const name of ['action', 'method', 'enctype', 'formaction', 'formmethod', 'formenctype']) {
      const value = element.getAttribute(name);
      if (value === null) element.removeAttribute('data-run-' + name);
      else element.setAttribute('data-run-' + name, value);
      element.removeAttribute(name);
    }
    element.removeAttribute('target');
    element.removeAttribute('formtarget');
  }
}

/** Serialized into the opaque-origin iframe. All dependencies are passed in as data. */
function listenInFrame(config: {
  type: string;
  generation: string;
  origin: string;
  maxFields: number;
  maxLength: number;
}) {
  const send = (action: Action) =>
    parent.postMessage({ type: config.type, generation: config.generation, action }, config.origin);
  const attribute = (element: Element | null, name: string): string | null =>
    element ? Element.prototype.getAttribute.call(element, 'data-run-' + name) : null;
  const lineBreaks = (value: string) => value.replace(/\r\n|\r|\n/g, '\r\n');

  document.addEventListener(
    'click',
    (event) => {
      const link = event.target instanceof Element ? event.target.closest('a,area') : null;
      const address = attribute(link, 'href');
      if (address === null) return;
      event.preventDefault();
      if (!event.isTrusted) return;
      const trimmed = address.trim();
      if (trimmed.startsWith('#')) {
        if (trimmed === '#') document.documentElement.scrollIntoView();
        else {
          try {
            document.getElementById(decodeURIComponent(trimmed.slice(1)))?.scrollIntoView();
          } catch {
            // The fragment is malformed. No navigation is needed.
          }
        }
        return;
      }
      send({ kind: 'link', address });
    },
    true,
  );

  document.addEventListener(
    'submit',
    (event) => {
      event.preventDefault();
      if (!event.isTrusted || !(event.target instanceof HTMLFormElement)) return;
      const form = event.target;
      const button = event.submitter;
      const address = attribute(button, 'formaction') ?? attribute(form, 'action') ?? '';
      const method =
        (attribute(button, 'formmethod') ?? attribute(form, 'method'))?.trim().toUpperCase() ||
        'GET';
      const encoding =
        (attribute(button, 'formenctype') ?? attribute(form, 'enctype'))?.trim().toLowerCase() ||
        'application/x-www-form-urlencoded';
      if (
        (method !== 'GET' && method !== 'POST') ||
        encoding !== 'application/x-www-form-urlencoded'
      ) {
        send({ kind: 'unsupported' });
        return;
      }
      const fields: PageRequest['fields'] = [];
      for (const [name, value] of new FormData(form, button ?? undefined)) {
        if (typeof value !== 'string') {
          send({ kind: 'unsupported' });
          return;
        }
        const pair: [string, string] = [lineBreaks(name), lineBreaks(value)];
        if (
          fields.length >= config.maxFields ||
          pair.some((part) => part.length > config.maxLength)
        ) {
          send({ kind: 'limit' });
          return;
        }
        fields.push(pair);
      }
      send({ kind: 'form', method, address, fields });
    },
    true,
  );
}

export function phpPreviewBridge(generation: string) {
  const config = {
    type: messageType,
    generation,
    origin: window.location.origin,
    maxFields: MAX_RUN_FIELDS,
    maxLength: MAX_RUN_FIELD_CHARACTERS,
  };
  return '(' + listenInFrame.toString() + ')(' + JSON.stringify(config) + ');';
}

export function readPhpAction(value: unknown, generation: string): Action | undefined {
  const message = value as {
    type?: unknown;
    generation?: unknown;
    action?: { kind?: unknown; address?: unknown; method?: unknown; fields?: unknown };
  } | null;
  if (message?.type !== messageType || message.generation !== generation || !message.action) return;
  const action = message.action;
  if (action.kind === 'unsupported' || action.kind === 'limit') return { kind: action.kind };
  if (
    (action.kind === 'link' || action.kind === 'form') &&
    typeof action.address === 'string' &&
    action.address.length <= maxMarkupLength
  ) {
    const address = action.address;
    if (action.kind === 'link') return { kind: 'link', address };
    if ((action.method === 'GET' || action.method === 'POST') && isRunParameterList(action.fields))
      return { kind: 'form', address, method: action.method, fields: action.fields };
  }
}

function entryForUrl(url: URL, pages: string[]) {
  if (url.origin !== projectOrigin || url.username || url.password) throw new Error(invalidAddress);
  const pieces = url.pathname.slice(1).split('/').map(decodeURIComponent);
  if (pieces.some((part) => !part || part === '.' || part === '..' || /[\\/]/u.test(part)))
    throw new Error(invalidAddress);
  const entry = pieces.join('/');
  if (!pages.includes(entry)) throw new Error(invalidAddress);
  return entry;
}

export function phpResultEntry(finalPath: string | null, pages: string[]) {
  if (!finalPath) return undefined;
  try {
    return entryForUrl(new URL(finalPath, projectOrigin), pages);
  } catch {
    return undefined;
  }
}

export function phpActionRequest(action: Action, finalPath: string, pages: string[]): PageRequest {
  if (action.kind === 'unsupported')
    throw new Error('Ten podgląd obsługuje formularze tekstowe wysyłane metodą GET lub POST.');
  if (action.kind === 'limit') throw new Error(fieldLimit);
  const address = action.address.trim();
  if (/^(?:[a-z][a-z0-9+.-]*:|[\\/]{2})/i.test(address)) throw new Error(invalidAddress);
  let url: URL;
  let entry: string;
  try {
    url = new URL(address, new URL(finalPath, projectOrigin));
    entry = entryForUrl(url, pages);
  } catch {
    throw new Error(invalidAddress);
  }
  const method = action.kind === 'form' ? action.method : 'GET';
  // A GET form replaces the query. A POST form keeps it separate from the body.
  const fields = action.kind === 'form' ? action.fields : Array.from(url.searchParams);
  const query = method === 'POST' ? Array.from(url.searchParams) : [];
  if (
    !isRunParameterList(fields) ||
    !isRunParameterList(query) ||
    fields.length + query.length > MAX_RUN_FIELDS
  )
    throw new Error(fieldLimit);
  return { entry, method, fields, ...(query.length ? { query } : {}) };
}

import type { ProjectFile } from '@zdaj/shared';
import { parse, serialize, type DefaultTreeAdapterMap } from 'parse5';
import { phpLanguage } from '@codemirror/lang-php';

/** Retain only literal HTML outside PHP blocks. PHP is never evaluated in a preview. */
export function staticPhpMarkup(source: string) {
  if (source.length > 1_000_000) return '';
  const fragments: string[] = [];
  phpLanguage.parser
    .configure({ top: 'Template' })
    .parse(source)
    .iterate({
      enter(node) {
        if (node.name === 'Text') fragments.push(source.slice(node.from, node.to));
      },
    });
  return fragments.join('');
}

/** Parse in JavaScript, then keep browser nodes in a template's inert document. */
export function inertDocument(markup: string) {
  type Element = DefaultTreeAdapterMap['element'];
  const parsed = parse(markup);
  const htmlNode = parsed.childNodes.find(
    (node): node is Element => 'tagName' in node && node.tagName === 'html',
  )!;
  const template = document.createElement('template');
  const doc = template.content.ownerDocument;
  const makeElement = (name: 'html' | 'head' | 'body', node?: Element) => {
    const element = doc.createElement(name);
    for (const attribute of node?.attrs ?? [])
      element.setAttribute(
        attribute.prefix ? `${attribute.prefix}:${attribute.name}` : attribute.name,
        attribute.value,
      );
    if (node && name !== 'html') {
      const fragment = document.createElement('template');
      fragment.innerHTML = serialize(node);
      element.append(fragment.content);
    }
    return element;
  };
  const root = makeElement('html', htmlNode);
  const head = makeElement(
    'head',
    htmlNode.childNodes.find(
      (node): node is Element => 'tagName' in node && node.tagName === 'head',
    ),
  );
  const body = makeElement(
    'body',
    htmlNode.childNodes.find(
      (node): node is Element => 'tagName' in node && node.tagName === 'body',
    ),
  );
  root.append(head, body);
  return { doc, root, head, body };
}

const mime = (path: string) =>
  /\.png$/i.test(path)
    ? 'image/png'
    : /\.jpe?g$/i.test(path)
      ? 'image/jpeg'
      : /\.svg$/i.test(path)
        ? 'image/svg+xml'
        : /\.gif$/i.test(path)
          ? 'image/gif'
          : /\.webp$/i.test(path)
            ? 'image/webp'
            : 'application/octet-stream';
function previewNonce() {
  const supplied = document.querySelector<HTMLMetaElement>('meta[name="csp-nonce"]')?.content;
  if (supplied && /^[A-Za-z0-9+/]{24,}={0,2}$/.test(supplied)) return supplied;
  return btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(24))));
}
const scriptText = (code: string) => code.replace(/<\/script/gi, '<\\/script');
function resolvePath(from: string, to: string): string | null {
  if (!to || /^(?:[a-z]+:|\/\/|#)/i.test(to)) return null;
  const parts = to.startsWith('/') ? [] : from.split('/').slice(0, -1);
  for (const part of to.split(/[?#]/)[0]!.split('/')) {
    if (part === '..') {
      if (!parts.length) return null;
      parts.pop();
    } else if (part && part !== '.') parts.push(part);
  }
  return parts.join('/');
}
export function createPreview(
  files: ProjectFile[],
  entry: string,
  options: { scripts?: boolean; preserveResourceAttributes?: boolean } = {},
): { html: string; dispose: () => void } {
  const map = new Map(files.map((file) => [file.path, file]));
  const source = map.get(entry);
  if (!source || source.encoding === 'base64' || !/\.(?:html?|php)$/i.test(entry))
    return { html: '', dispose: () => undefined };
  const nonce = previewNonce();
  // Used only by the hidden, script-free style measurement frame. CSP blocks
  // original URLs, while attribute selectors retain their actual meaning.
  const preserveAttributes = options.scripts === false && options.preserveResourceAttributes;
  const asset = (from: string, value: string) => {
    const path = resolvePath(from, value),
      file = path ? map.get(path) : undefined;
    if (!file) return 'data:,';
    return `data:${mime(file.path)};base64,${file.encoding === 'base64' ? file.content : btoa(unescape(encodeURIComponent(file.content)))}`;
  };
  const css = (text: string, path: string) =>
    text
      .replace(/@import\s+[^;]+;?/gi, '')
      .replace(
        /url\(\s*['"]?([^)'"\s]+)['"]?\s*\)/gi,
        (_all: string, url: string) => `url("${asset(path, url)}")`,
      );
  const { doc, root, head, body } = inertDocument(
    /\.php$/i.test(entry) ? staticPhpMarkup(source.content) : source.content,
  );
  root
    .querySelectorAll(
      'base,iframe,object,embed,meta[http-equiv],link[rel="preload"],link[rel="prefetch"]',
    )
    .forEach((element) => element.remove());
  root.querySelectorAll('style').forEach((style) => {
    style.textContent = css(style.textContent || '', entry);
  });
  root.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]').forEach((link) => {
    const path = resolvePath(entry, link.getAttribute('href') || '');
    const file = path ? map.get(path) : undefined;
    const style = doc.createElement('style');
    style.textContent = file ? css(file.content, file.path) : '';
    link.replaceWith(style);
  });
  root
    .querySelectorAll<HTMLElement>('[style]')
    .forEach((element) =>
      element.setAttribute('style', css(element.getAttribute('style') || '', entry)),
    );
  const deferredScripts: HTMLScriptElement[] = [];
  root.querySelectorAll<HTMLScriptElement>('script').forEach((script) => {
    if (options.scripts === false) {
      script.remove();
      return;
    }
    if (
      script.type &&
      !['text/javascript', 'application/javascript', 'module'].includes(script.type)
    )
      return;
    const sourcePath = script.getAttribute('src');
    const path = sourcePath ? resolvePath(entry, sourcePath) : null;
    const file = path ? map.get(path) : undefined;
    const code = sourcePath
      ? file?.encoding !== 'base64'
        ? file?.content || ''
        : ''
      : script.textContent || '';
    const deferred =
      !!sourcePath &&
      script.type !== 'module' &&
      (script.hasAttribute('defer') || script.hasAttribute('async'));
    script.removeAttribute('src');
    script.removeAttribute('defer');
    script.removeAttribute('async');
    script.removeAttribute('integrity');
    script.removeAttribute('crossorigin');
    script.setAttribute('nonce', nonce);
    script.textContent = scriptText(code);
    if (deferred) {
      script.remove();
      deferredScripts.push(script);
    }
  });
  // Keep globals and source order; listeners registered by deferred files still see DOMContentLoaded.
  body.append(...deferredScripts);
  const handlers: string[] = [];
  let handlerId = 0;
  [root, ...root.querySelectorAll<HTMLElement>('*')].forEach((element) => {
    const id = `event-${handlerId++}`;
    element.removeAttribute('data-preview-event');
    for (const attribute of [...element.attributes]) {
      if (!/^on[a-z]+$/i.test(attribute.name)) continue;
      if (options.scripts === false) {
        element.removeAttribute(attribute.name);
        continue;
      }
      element.setAttribute('data-preview-event', id);
      const eventName = attribute.name.slice(2).toLowerCase();
      handlers.push(
        `{const element=document.querySelector('[data-preview-event="${id}"]');if(element)element.addEventListener(${JSON.stringify(eventName)},function(event){const result=(function(event){${attribute.value}\n}).call(element,event);if(result===false)event.preventDefault();});}`,
      );
      element.removeAttribute(attribute.name);
    }
  });
  root.querySelectorAll<HTMLElement>('[src]:not(script),[srcset]').forEach((element) => {
    if (element.hasAttribute('src') && !preserveAttributes)
      element.setAttribute('src', asset(entry, element.getAttribute('src') || ''));
    if (!preserveAttributes) element.removeAttribute('srcset');
  });
  root.querySelectorAll('a[href]').forEach((link) => {
    const path = resolvePath(entry, link.getAttribute('href') || '');
    if (!preserveAttributes) link.setAttribute('href', '#');
    if (path && map.has(path) && /\.(?:html?|php)$/i.test(path))
      link.setAttribute('data-preview-path', path);
    link.removeAttribute('target');
    link.removeAttribute('download');
  });
  const csp = doc.createElement('meta');
  csp.httpEquiv = 'Content-Security-Policy';
  csp.content = `default-src 'none'; script-src 'nonce-${nonce}'; style-src 'unsafe-inline'; img-src data:; font-src data:; connect-src 'none'; form-action 'none'; base-uri 'none'; frame-src 'none'; media-src data:`;
  head.prepend(csp);
  const bridge = doc.createElement('script');
  bridge.setAttribute('nonce', nonce);
  bridge.textContent = scriptText(
    `${handlers.join('\n')}\ndocument.addEventListener('click',function(event){var link=event.target instanceof Element?event.target.closest('a'):null;if(link){event.preventDefault();var path=link.getAttribute('data-preview-path');if(path)parent.postMessage({type:'zdaj-preview-navigate',path:path},'*');}},true);document.addEventListener('submit',function(event){event.preventDefault();},true);`,
  );
  if (options.scripts !== false) body.append(bridge);
  return { html: '<!doctype html>' + root.outerHTML, dispose: () => undefined };
}

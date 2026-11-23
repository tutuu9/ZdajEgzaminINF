import type { ProjectFile } from '@zdaj/shared';
import { parse, serialize, type DefaultTreeAdapterMap } from 'parse5';
import { phpLanguage } from '@codemirror/lang-php';
import { prepareInspection } from './inspector/source';
import { createInspectionBridge } from './inspector/bridge';
import type { InspectionIndex } from './inspector/types';
import { consoleBridgeScript } from './preview-console';
import { phpPreviewBridge, preparePhpPreview } from './php-preview';

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
            : /\.bmp$/i.test(path)
              ? 'image/bmp'
              : /\.ico$/i.test(path)
                ? 'image/x-icon'
                : /\.avif$/i.test(path)
                  ? 'image/avif'
                  : 'application/octet-stream';
const imagePath = /\.(?:png|jpe?g|gif|webp|svg|bmp|ico|avif)$/i;
function previewNonce() {
  const supplied = document.querySelector<HTMLMetaElement>('meta[name="csp-nonce"]')?.content;
  if (supplied && /^[A-Za-z0-9+/]{24,}={0,2}$/.test(supplied)) return supplied;
  return btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(24))));
}
const scriptText = (code: string) => code.replace(/<\/script/gi, '<\\/script');
/** Browsers read a backslash as a slash and decode percent escapes before asking for a file. */
export function resolvePath(from: string, to: string): string | null {
  if (!to || /^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i.test(to)) return null;
  let target = to.replace(/\\/g, '/').split(/[?#]/)[0]!;
  try {
    target = decodeURIComponent(target);
  } catch {
    // A stray percent sign stays literal, as it does in a file name.
  }
  const parts = target.startsWith('/') ? [] : from.split('/').slice(0, -1);
  for (const part of target.split('/')) {
    if (part === '..') {
      if (!parts.length) return null;
      parts.pop();
    } else if (part && part !== '.') parts.push(part);
  }
  return parts.join('/');
}

export interface MissingAsset {
  /** The address exactly as the learner wrote it. */
  value: string;
  /** A project file with the same name in another folder, when there is one. */
  suggestion?: string;
}
/** An address that reaches a project file only when letter case is ignored. */
export interface InexactAsset {
  value: string;
  /** The file's real path. */
  path: string;
}

/**
 * Finds project files the way the examination workstation (Windows) does: letter case is
 * ignored. A file of the same name in another folder is only suggested, never substituted,
 * because that path would not work outside the preview either.
 */
export function assetLookup<T extends { path: string }>(files: readonly T[]) {
  const exact = new Map(files.map((file) => [file.path, file]));
  const folded = new Map<string, T>();
  for (const file of files) {
    const key = file.path.toLowerCase();
    if (!folded.has(key)) folded.set(key, file);
  }
  const find = (from: string, value: string): T | undefined => {
    const path = resolvePath(from, value);
    if (path === null) return undefined;
    return exact.get(path) ?? folded.get(path.toLowerCase());
  };
  const suggest = (value: string): string | undefined => {
    const name = resolvePath('', value)?.split('/').pop()?.toLowerCase();
    if (!name) return undefined;
    return files.find((file) => file.path.split('/').pop()!.toLowerCase() === name)?.path;
  };
  return { find, suggest };
}

/** Rewrites every url(...) of a stylesheet, including quoted addresses that contain spaces. */
export function rewriteCssUrls(text: string, replace: (url: string) => string) {
  return text.replace(
    /url\(\s*(?:"([^"]*)"|'([^']*)'|([^)'"\s]+))\s*\)/gi,
    (_all: string, double?: string, single?: string, bare?: string) =>
      `url("${replace((double ?? single ?? bare ?? '').trim())}")`,
  );
}

/**
 * Learner JavaScript may set an image address after the page is built (img.src = '…',
 * innerHTML, style.backgroundImage). The frame has no network, so this trusted script,
 * placed before any learner script, swaps such addresses for the project's own files.
 *
 * The address the learner wrote is kept in data-preview-src / data-preview-poster, and
 * getAttribute and the src property answer with it, so a script that reads or compares an
 * image address (a gallery, a toggle) behaves as it does on a real server.
 */
function runtimeAssetScript(images: Record<string, string>, entry: string) {
  const data = (value: unknown) => JSON.stringify(value).replace(/</g, '\\u003c');
  return `(function(){var assets=${data(images)},base=${data(entry.split('/').slice(0, -1))};
var getAttr=Element.prototype.getAttribute,setAttr=Element.prototype.setAttribute,removeAttr=Element.prototype.removeAttribute;
var root='http://localhost/';for(var b=0;b<base.length;b++)root+=encodeURIComponent(base[b])+'/';
function find(value){if(!value||/^(?:[a-z][a-z0-9+.-]*:|\\/\\/|#)/i.test(value))return null;
var target=value.replace(/\\\\/g,'/').split(/[?#]/)[0];try{target=decodeURIComponent(target);}catch(e){}
var parts=target.charAt(0)==='/'?[]:base.slice(),list=target.split('/');
for(var i=0;i<list.length;i++){var part=list[i];if(part==='..'){if(!parts.length)return null;parts.pop();}else if(part&&part!=='.')parts.push(part);}
var key=parts.join('/').toLowerCase();return Object.prototype.hasOwnProperty.call(assets,key)?assets[key]:null;}
function resource(element,key){return(key==='src'||key==='poster')&&element.tagName!=='SCRIPT'&&element.tagName!=='IFRAME';}
function store(element,name,value){var found=find(value);
if(found){setAttr.call(element,'data-preview-'+name,value);setAttr.call(element,name,found);}
else{removeAttr.call(element,'data-preview-'+name);setAttr.call(element,name,value);}}
function attribute(element,name){var value=getAttr.call(element,name);if(value&&find(value))store(element,name,value);}
Element.prototype.getAttribute=function(name){var key=String(name).toLowerCase();
if(resource(this,key)){var kept=getAttr.call(this,'data-preview-'+key);if(kept!==null)return kept;}
return getAttr.apply(this,arguments);};
Element.prototype.setAttribute=function(name,value){var key=String(name).toLowerCase();
if(resource(this,key)){store(this,key,String(value));return;}
return setAttr.apply(this,arguments);};
Element.prototype.removeAttribute=function(name){var key=String(name).toLowerCase();
if(resource(this,key))removeAttr.call(this,'data-preview-'+key);
return removeAttr.apply(this,arguments);};
function property(type,name){var proto=type&&type.prototype,native=proto&&Object.getOwnPropertyDescriptor(proto,name);
if(!native||!native.get||!native.set)return;
Object.defineProperty(proto,name,{configurable:true,enumerable:native.enumerable,
get:function(){var kept=getAttr.call(this,'data-preview-'+name);if(kept===null)return native.get.call(this);
try{return new URL(kept.replace(/\\\\/g,'/'),root).href;}catch(e){return kept;}},
set:function(value){store(this,name,String(value));}});}
property(window.HTMLImageElement,'src');property(window.HTMLInputElement,'src');property(window.HTMLSourceElement,'src');
property(window.HTMLMediaElement,'src');property(window.HTMLVideoElement,'poster');
function style(element){var value=getAttr.call(element,'style');if(!value||value.indexOf('url(')<0)return;
var next=value.replace(/url\\(\\s*(?:"([^"]*)"|'([^']*)'|([^)'"\\s]+))\\s*\\)/gi,function(all,a,b,c){var found=find((a||b||c||'').trim());return found?'url("'+found+'")':all;});
if(next!==value)setAttr.call(element,'style',next);}
function fix(element){if(element.nodeType!==1)return;var tag=element.tagName;
if(tag!=='SCRIPT'&&tag!=='IFRAME'&&element.hasAttribute('src'))attribute(element,'src');
if(element.hasAttribute('poster'))attribute(element,'poster');
if(element.hasAttribute('style'))style(element);}
new MutationObserver(function(records){for(var i=0;i<records.length;i++){var record=records[i];
if(record.type==='attributes'){fix(record.target);continue;}
for(var j=0;j<record.addedNodes.length;j++){var node=record.addedNodes[j];if(node.nodeType!==1)continue;fix(node);
var inner=node.querySelectorAll('[src],[poster],[style]');for(var k=0;k<inner.length;k++)fix(inner[k]);}}
}).observe(document,{subtree:true,childList:true,attributes:true,attributeFilter:['src','poster','style']});})();`;
}
export function createPreview(
  files: ProjectFile[],
  entry: string,
  options: {
    scripts?: boolean;
    preserveResourceAttributes?: boolean;
    inspection?: boolean;
    /** Markup already produced elsewhere, e.g. by a sandboxed PHP run, shown instead of the file. */
    markup?: string;
    /** Page whose folder relative addresses start from, when it differs from the entry. */
    base?: string;
    /** Enable native form events with the trusted PHP bridge and learner scripts removed. */
    phpGeneration?: string;
  } = {},
): {
  html: string;
  dispose: () => void;
  inspection?: InspectionIndex;
  missing: MissingAsset[];
  inexact: InexactAsset[];
} {
  const map = new Map(files.map((file) => [file.path, file]));
  const lookup = assetLookup(files);
  const missing: MissingAsset[] = [];
  const inexact: InexactAsset[] = [];
  /** Finds a project file and remembers an address that matches it only without letter case. */
  const locate = (from: string, value: string) => {
    const file = lookup.find(from, value);
    if (
      file &&
      resolvePath(from, value) !== file.path &&
      !inexact.some((item) => item.value === value)
    )
      inexact.push({ value, path: file.path });
    return file;
  };
  const source = map.get(entry);
  if (!source || source.encoding === 'base64' || !/\.(?:html?|php)$/i.test(entry))
    return { html: '', dispose: () => undefined, missing, inexact };
  const origin = options.base ?? entry;
  const nonce = previewNonce();
  // Inspection owns its trusted bridge; learner JavaScript stays disabled. Measurement
  // frames never get instrumentation or a script, even if inspection is requested.
  const inspecting =
    options.inspection && !options.preserveResourceAttributes && !options.phpGeneration;
  const scripts = !inspecting && !options.phpGeneration && options.scripts !== false;
  const prepared = inspecting ? prepareInspection(files, entry) : undefined;
  // Used only by the hidden, script-free style measurement frame. CSP blocks
  // original URLs, while attribute selectors retain their actual meaning.
  const preserveAttributes = options.scripts === false && options.preserveResourceAttributes;
  const dataUri = (file: ProjectFile) =>
    `data:${mime(file.path)};base64,${file.encoding === 'base64' ? file.content : btoa(unescape(encodeURIComponent(file.content)))}`;
  const asset = (from: string, value: string) => {
    const address = value.trim();
    // Embedded images and same-document references need no file.
    if (/^data:/i.test(address) || address.startsWith('#')) return address;
    const file = locate(from, address);
    if (file) return dataUri(file);
    if (resolvePath(from, address) !== null && !missing.some((item) => item.value === address))
      missing.push({ value: address, suggestion: lookup.suggest(address) });
    return 'data:,';
  };
  const css = (text: string, path: string) =>
    rewriteCssUrls(text.replace(/@import\s+[^;]+;?/gi, ''), (url) => asset(path, url))
      // Stylesheets become raw-text <style> nodes in srcdoc. Keep external CSS
      // strings from escaping that node when the browser reparses outerHTML.
      .replace(/<\/style/gi, '<\\/style');
  const { doc, root, head, body } = inertDocument(
    options.markup ??
      prepared?.markup ??
      (/\.php$/i.test(entry) ? staticPhpMarkup(source.content) : source.content),
  );
  root
    .querySelectorAll(
      'base,iframe,object,embed,meta[http-equiv],link[rel="preload"],link[rel="prefetch"]',
    )
    .forEach((element) => element.remove());
  root.querySelectorAll('style').forEach((style) => {
    style.textContent = css(style.textContent || '', origin);
  });
  root.querySelectorAll<HTMLLinkElement>('link[rel~="stylesheet"]').forEach((link) => {
    const file = locate(origin, link.getAttribute('href') || '');
    const style = doc.createElement('style');
    style.textContent = file && file.encoding !== 'base64' ? css(file.content, file.path) : '';
    if (link.hasAttribute('media')) style.setAttribute('media', link.getAttribute('media')!);
    if (link.hasAttribute('disabled') || /(?:^|\s)alternate(?:\s|$)/i.test(link.rel))
      style.setAttribute('media', 'not all');
    link.replaceWith(style);
  });
  root
    .querySelectorAll<HTMLElement>('[style]')
    .forEach((element) =>
      element.setAttribute('style', css(element.getAttribute('style') || '', origin)),
    );
  const deferredScripts: HTMLScriptElement[] = [];
  root.querySelectorAll<HTMLScriptElement>('script').forEach((script) => {
    if (!scripts) {
      script.remove();
      return;
    }
    if (
      script.type &&
      !['text/javascript', 'application/javascript', 'module'].includes(script.type)
    )
      return;
    const sourcePath = script.getAttribute('src');
    const file = sourcePath ? locate(origin, sourcePath) : undefined;
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
    // A sourceURL lets the browser name the learner's file when it reports an error.
    script.textContent =
      scriptText(code) +
      (file && code ? `\n//# sourceURL=${file.path.replace(/[^\w./ -]/g, '_')}` : '');
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
      if (!scripts) {
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
  if (!preserveAttributes)
    root
      .querySelectorAll<HTMLElement>('[src]:not(script),[srcset],[poster],[background]')
      .forEach((element) => {
        // The preview has one size, so the first srcset candidate stands in for the set.
        const candidate = element
          .getAttribute('srcset')
          ?.trim()
          .split(/[\s,]+/)[0];
        if (element.tagName === 'IMG' && !element.getAttribute('src') && candidate)
          element.setAttribute('src', candidate);
        element.removeAttribute('srcset');
        for (const name of ['src', 'poster', 'background']) {
          if (!element.hasAttribute(name)) continue;
          const written = element.getAttribute(name) || '';
          const address = asset(origin, written);
          // Learner scripts read the address as written; see runtimeAssetScript.
          if (scripts && name !== 'background' && address !== written)
            element.setAttribute(`data-preview-${name}`, written);
          element.setAttribute(name, address);
        }
      });
  if (options.phpGeneration) preparePhpPreview(root);
  else
    root.querySelectorAll('a[href]').forEach((link) => {
      const path = locate(origin, link.getAttribute('href') || '')?.path;
      if (!preserveAttributes) link.setAttribute('href', '#');
      if (path && /\.(?:html?|php)$/i.test(path)) link.setAttribute('data-preview-path', path);
      link.removeAttribute('target');
      link.removeAttribute('download');
    });
  const csp = doc.createElement('meta');
  csp.httpEquiv = 'Content-Security-Policy';
  csp.content = `default-src 'none'; script-src 'nonce-${nonce}'; style-src 'unsafe-inline'; img-src data:; font-src data:; connect-src 'none'; form-action 'none'; base-uri 'none'; frame-src 'none'; media-src data:`;
  head.prepend(csp);
  const images = scripts
    ? Object.fromEntries(
        files
          .filter((file) => imagePath.test(file.path))
          .map((file) => [file.path.toLowerCase(), dataUri(file)]),
      )
    : {};
  if (scripts) {
    const reporter = doc.createElement('script');
    reporter.setAttribute('nonce', nonce);
    reporter.textContent = scriptText(consoleBridgeScript);
    csp.after(reporter);
  }
  if (scripts) {
    const runtime = doc.createElement('script');
    runtime.setAttribute('nonce', nonce);
    runtime.textContent = scriptText(runtimeAssetScript(images, origin));
    csp.after(runtime);
  }
  const bridge = doc.createElement('script');
  bridge.setAttribute('nonce', nonce);
  bridge.textContent = scriptText(
    `${handlers.join('\n')}\ndocument.addEventListener('click',function(event){var link=event.target instanceof Element?event.target.closest('a'):null;if(link){event.preventDefault();var path=link.getAttribute('data-preview-path');if(path)parent.postMessage({type:'zdaj-preview-navigate',path:path},'*');}},true);document.addEventListener('submit',function(event){event.preventDefault();},true);`,
  );
  if (scripts) body.append(bridge);
  if (options.phpGeneration) {
    const phpBridge = doc.createElement('script');
    phpBridge.setAttribute('nonce', nonce);
    phpBridge.textContent = scriptText(phpPreviewBridge(options.phpGeneration));
    body.append(phpBridge);
  }
  if (prepared) {
    const attribute = prepared.index.attribute;
    const present = new Set(
      [root, ...root.querySelectorAll(`[${attribute}]`)]
        .map((element) => element.getAttribute(attribute))
        .filter((id): id is string => !!id),
    );
    prepared.index.elements = prepared.index.elements.filter((element) => present.has(element.id));
    const inspector = doc.createElement('script');
    inspector.setAttribute('nonce', nonce);
    inspector.textContent = scriptText(createInspectionBridge(prepared.index));
    body.append(inspector);
  }
  return {
    html: '<!doctype html>' + root.outerHTML,
    dispose: () => undefined,
    inspection: prepared?.index,
    missing,
    inexact,
  };
}

/**
 * Reads the measurable properties of a project image straight from its bytes and compares
 * them with one image requirement of the paper. Nothing is uploaded: the bytes are the
 * learner's own project file, already stored in this browser.
 *
 * Only properties a program can measure are compared (format, size, transparency support,
 * animation frames and delays). What the image shows stays a visual check against the paper.
 */
import type { CatalogGraphic, GraphicFormat, ProjectFile } from '@zdaj/shared';
import { matchHandInFiles } from './exam-report';

export interface ImageFacts {
  format: GraphicFormat;
  width: number;
  height: number;
  /** The file can store transparency (PNG alpha or tRNS, GIF transparent colour). */
  canBeTransparent: boolean;
  /** GIF only: one entry per frame. */
  frames?: { delayMs: number; disposal: number }[];
}

/** The ±5 px the marking criteria allow for the side computed from the original. */
export const PROPORTION_TOLERANCE_PX = 5;

const u16be = (bytes: Uint8Array, at: number) => (bytes[at]! << 8) | bytes[at + 1]!;
const u16le = (bytes: Uint8Array, at: number) => bytes[at]! | (bytes[at + 1]! << 8);
const u32be = (bytes: Uint8Array, at: number) =>
  ((bytes[at]! << 24) >>> 0) + (bytes[at + 1]! << 16) + (bytes[at + 2]! << 8) + bytes[at + 3]!;
const ascii = (bytes: Uint8Array, at: number, length: number) =>
  String.fromCharCode(...bytes.subarray(at, at + length));

function readPng(bytes: Uint8Array): ImageFacts | null {
  const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (bytes.length < 33 || signature.some((value, index) => bytes[index] !== value)) return null;
  if (ascii(bytes, 12, 4) !== 'IHDR') return null;
  const colourType = bytes[25]!;
  // Colour types 4 and 6 carry an alpha channel; other types use a tRNS chunk.
  let canBeTransparent = colourType === 4 || colourType === 6;
  for (let at = 8; at + 8 <= bytes.length && !canBeTransparent;) {
    const length = u32be(bytes, at);
    const type = ascii(bytes, at + 4, 4);
    if (type === 'tRNS') canBeTransparent = true;
    if (type === 'IDAT' || type === 'IEND') break;
    at += 12 + length;
  }
  return {
    format: 'png',
    width: u32be(bytes, 16),
    height: u32be(bytes, 20),
    canBeTransparent,
  };
}

/** Start-of-frame markers carry the size; DHT (C4), JPG (C8) and DAC (CC) do not. */
const JPEG_FRAME_MARKERS = new Set([
  0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf,
]);

function readJpeg(bytes: Uint8Array): ImageFacts | null {
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;
  for (let at = 2; at + 9 < bytes.length;) {
    if (bytes[at] !== 0xff) return null;
    const marker = bytes[at + 1]!;
    if (marker === 0xff) {
      at += 1; // fill byte
      continue;
    }
    if (JPEG_FRAME_MARKERS.has(marker))
      return {
        format: 'jpeg',
        height: u16be(bytes, at + 5),
        width: u16be(bytes, at + 7),
        canBeTransparent: false,
      };
    at += 2 + u16be(bytes, at + 2);
  }
  return null;
}

function skipSubBlocks(bytes: Uint8Array, at: number) {
  while (at < bytes.length && bytes[at] !== 0) at += bytes[at]! + 1;
  return at + 1;
}

function readGif(bytes: Uint8Array): ImageFacts | null {
  const header = ascii(bytes, 0, 6);
  if (header !== 'GIF87a' && header !== 'GIF89a') return null;
  const packed = bytes[10]!;
  let at = 13 + (packed & 0x80 ? 3 * 2 ** ((packed & 0x07) + 1) : 0);
  const frames: { delayMs: number; disposal: number }[] = [];
  let pending = { delayMs: 0, disposal: 0 };
  let canBeTransparent = false;
  while (at < bytes.length) {
    const block = bytes[at]!;
    if (block === 0x3b) break; // trailer
    if (block === 0x21) {
      if (bytes[at + 1] === 0xf9 && bytes[at + 2] === 4) {
        // Graphic control extension: disposal method, transparency flag, delay in 1/100 s.
        const flags = bytes[at + 3]!;
        pending = { delayMs: u16le(bytes, at + 4) * 10, disposal: (flags >> 2) & 0x07 };
        if (flags & 0x01) canBeTransparent = true;
      }
      at = skipSubBlocks(bytes, at + 2);
      continue;
    }
    if (block === 0x2c) {
      frames.push(pending);
      pending = { delayMs: 0, disposal: 0 };
      const local = bytes[at + 9]!;
      at += 10 + (local & 0x80 ? 3 * 2 ** ((local & 0x07) + 1) : 0);
      at = skipSubBlocks(bytes, at + 1); // LZW minimum code size, then image data
      continue;
    }
    return null; // unknown block: not a readable GIF
  }
  return {
    format: 'gif',
    width: u16le(bytes, 6),
    height: u16le(bytes, 8),
    canBeTransparent,
    frames,
  };
}

/** Reads PNG, JPEG or GIF facts, or null for anything else (including damaged files). */
export function readImageFacts(bytes: Uint8Array): ImageFacts | null {
  try {
    return readPng(bytes) ?? readJpeg(bytes) ?? readGif(bytes);
  } catch {
    return null;
  }
}

export function fileBytes(file: ProjectFile): Uint8Array<ArrayBuffer> | null {
  if (file.encoding !== 'base64') return null;
  try {
    return Uint8Array.from(atob(file.content), (character) => character.charCodeAt(0));
  } catch {
    return null;
  }
}

export type CheckState = 'ok' | 'wrong' | 'look';
export interface GraphicCheckItem {
  label: string;
  state: CheckState;
  detail: string;
}
export interface GraphicReport {
  requirement: CatalogGraphic;
  /** Project file that matched, or undefined when the image is missing. */
  path?: string;
  /** The project name differs from the printed one only by letter case. */
  wrongCase?: boolean;
  /** Undefined when the file is missing; null when it cannot be read as an image. */
  facts?: ImageFacts | null;
  items: GraphicCheckItem[];
}

const FORMAT_NAMES: Record<GraphicFormat, string> = { jpeg: 'JPEG', png: 'PNG', gif: 'GIF' };
const extensionFormat = (path: string): GraphicFormat | undefined => {
  const extension = /\.([^.]+)$/.exec(path)?.[1]?.toLowerCase();
  if (extension === 'jpg' || extension === 'jpeg') return 'jpeg';
  if (extension === 'png' || extension === 'gif') return extension;
  return undefined;
};

/** The side that must follow the original's proportions, rounded like an image editor. */
export function proportionalSize(requirement: CatalogGraphic) {
  const { original, width, height } = requirement;
  if (!original) return undefined;
  if (width !== undefined && height === undefined)
    return {
      side: 'height' as const,
      value: Math.round((width * original.height) / original.width),
    };
  if (height !== undefined && width === undefined)
    return {
      side: 'width' as const,
      value: Math.round((height * original.width) / original.height),
    };
  return undefined;
}

function sizeItems(requirement: CatalogGraphic, facts: ImageFacts): GraphicCheckItem[] {
  const items: GraphicCheckItem[] = [];
  const actual = `${facts.width} × ${facts.height} px`;
  for (const side of ['width', 'height'] as const) {
    const expected = requirement[side];
    if (expected === undefined) continue;
    const value = facts[side];
    items.push({
      label: side === 'width' ? 'Szerokość' : 'Wysokość',
      state: value === expected ? 'ok' : 'wrong',
      detail:
        value === expected
          ? `${value} px, jak w arkuszu`
          : `${value} px, arkusz wymaga dokładnie ${expected} px`,
    });
  }
  const proportional = proportionalSize(requirement);
  if (proportional) {
    const value = facts[proportional.side];
    const close = Math.abs(value - proportional.value) <= PROPORTION_TOLERANCE_PX;
    items.push({
      label: 'Proporcje',
      state: close ? 'ok' : 'wrong',
      detail: close
        ? `${actual} — proporcje oryginału zachowane`
        : `${actual}; przy zachowanych proporcjach ${proportional.side === 'width' ? 'szerokość' : 'wysokość'} wynosiłaby około ${proportional.value} px. Zablokuj łańcuch proporcji i skaluj jeszcze raz z oryginału.`,
    });
  }
  return items;
}

/** Compares one project file with one paper requirement. Pure: no pixels are decoded here. */
export function checkGraphic(requirement: CatalogGraphic, files: ProjectFile[]): GraphicReport {
  const [match] = matchHandInFiles([requirement.file], files);
  if (!match || match.status === 'missing') return { requirement, items: [] };
  const name = match.actual ?? match.name;
  const file = files.find((candidate) => (candidate.path.split('/').pop() ?? '') === name);
  const report: GraphicReport = {
    requirement,
    path: file?.path ?? name,
    wrongCase: match.status === 'wrong-case',
    items: [],
  };
  const bytes = file ? fileBytes(file) : null;
  const facts = bytes ? readImageFacts(bytes) : null;
  report.facts = facts;
  if (!facts) return report;

  const accepted = requirement.formats.map((format) => FORMAT_NAMES[format]).join(' lub ');
  const formatOk = requirement.formats.includes(facts.format);
  const named = extensionFormat(name);
  report.items.push({
    label: 'Format',
    state: formatOk ? 'ok' : 'wrong',
    detail: formatOk
      ? `${FORMAT_NAMES[facts.format]}`
      : `plik jest w formacie ${FORMAT_NAMES[facts.format]}, arkusz wymaga ${accepted}. Zmiana samego rozszerzenia nie zmienia formatu — wyeksportuj obraz ponownie.`,
  });
  if (named && named !== facts.format)
    report.items.push({
      label: 'Rozszerzenie',
      state: 'wrong',
      detail: `rozszerzenie wskazuje ${FORMAT_NAMES[named]}, a zawartość to ${FORMAT_NAMES[facts.format]}`,
    });
  report.items.push(...sizeItems(requirement, facts));
  if (requirement.transparent)
    report.items.push(
      facts.canBeTransparent
        ? {
            label: 'Przezroczystość',
            state: 'look',
            detail: 'plik może zapisać przezroczystość; sprawdzamy, czy tło jest przezroczyste…',
          }
        : {
            label: 'Przezroczystość',
            state: 'wrong',
            detail:
              'plik nie ma kanału przezroczystości. Dodaj kanał alfa (np. GIMP: Warstwa → Przezroczystość → Dodaj kanał alfa), usuń tło i wyeksportuj PNG.',
          },
    );
  if (requirement.frames !== undefined) {
    const frames = facts.frames ?? [];
    report.items.push({
      label: 'Klatki',
      state: frames.length === requirement.frames ? 'ok' : 'wrong',
      detail:
        frames.length === requirement.frames
          ? `${frames.length}, jak w arkuszu`
          : `${frames.length}, arkusz wymaga ${requirement.frames}`,
    });
  }
  if (requirement.frameDelayMs !== undefined) {
    const delays = [...new Set((facts.frames ?? []).map((frame) => frame.delayMs))];
    const ok = delays.length === 1 && delays[0] === requirement.frameDelayMs;
    report.items.push({
      label: 'Czas klatki',
      state: ok ? 'ok' : 'wrong',
      detail: ok
        ? `${requirement.frameDelayMs} ms dla każdej klatki`
        : `${delays.length ? delays.map((delay) => `${delay} ms`).join(', ') : 'brak'}; arkusz wymaga ${requirement.frameDelayMs} ms dla każdej klatki`,
    });
  }
  return report;
}

/**
 * Decides the transparency item from a decoded image: the background counts as transparent
 * when at least one corner pixel is fully transparent.
 */
export function transparencyFromCorners(cornerAlpha: number[]): GraphicCheckItem {
  const transparent = cornerAlpha.some((alpha) => alpha === 0);
  return {
    label: 'Przezroczystość',
    state: transparent ? 'ok' : 'wrong',
    detail: transparent
      ? 'tło jest przezroczyste'
      : 'plik ma kanał przezroczystości, ale narożniki obrazu są nieprzezroczyste — tło nie zostało usunięte',
  };
}

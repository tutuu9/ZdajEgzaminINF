import { describe, expect, it } from 'vitest';
import type { CatalogGraphic, ProjectFile } from '@zdaj/shared';
import { catalog } from '../packages/content/src/catalog';
import {
  checkGraphic,
  proportionalSize,
  readImageFacts,
  transparencyFromCorners,
} from '../apps/web/src/graphics-check';

const u32 = (value: number) => [
  (value >>> 24) & 255,
  (value >>> 16) & 255,
  (value >>> 8) & 255,
  value & 255,
];
const u16le = (value: number) => [value & 255, (value >>> 8) & 255];
const text = (value: string) => [...value].map((character) => character.charCodeAt(0));
const chunk = (type: string, data: number[]) => [
  ...u32(data.length),
  ...text(type),
  ...data,
  0,
  0,
  0,
  0,
];

/** A PNG header is enough for size and colour type; pixel data is not needed. */
function png(width: number, height: number, colourType: number, extra: number[] = []) {
  return new Uint8Array([
    0x89,
    0x50,
    0x4e,
    0x47,
    0x0d,
    0x0a,
    0x1a,
    0x0a,
    ...chunk('IHDR', [...u32(width), ...u32(height), 8, colourType, 0, 0, 0]),
    ...extra,
    ...chunk('IDAT', []),
    ...chunk('IEND', []),
  ]);
}
function jpeg(width: number, height: number) {
  const app0 = [0xff, 0xe0, 0, 16, ...text('JFIF'), 0, 1, 1, 0, 0, 1, 0, 1, 0, 0];
  const sof = [
    0xff,
    0xc0,
    0,
    17,
    8,
    (height >> 8) & 255,
    height & 255,
    (width >> 8) & 255,
    width & 255,
    3,
  ];
  return new Uint8Array([
    0xff,
    0xd8,
    ...app0,
    ...sof,
    1,
    0x22,
    0,
    2,
    0x11,
    1,
    3,
    0x11,
    1,
    0xff,
    0xd9,
  ]);
}
function gif(width: number, height: number, delaysCs: number[], transparent = true) {
  const frames = delaysCs.flatMap((delay) => [
    0x21,
    0xf9,
    4,
    (2 << 2) | (transparent ? 1 : 0),
    ...u16le(delay),
    0,
    0,
    0x2c,
    0,
    0,
    0,
    0,
    ...u16le(width),
    ...u16le(height),
    0,
    2,
    2,
    0x4c,
    0x01,
    0,
  ]);
  return new Uint8Array([
    ...text('GIF89a'),
    ...u16le(width),
    ...u16le(height),
    0x80,
    0,
    0,
    0,
    0,
    0,
    255,
    255,
    255,
    ...frames,
    0x3b,
  ]);
}
const file = (path: string, bytes: Uint8Array): ProjectFile => ({
  path,
  content: btoa(String.fromCharCode(...bytes)),
  encoding: 'base64',
});
const states = (requirement: CatalogGraphic, files: ProjectFile[]) =>
  Object.fromEntries(
    checkGraphic(requirement, files).items.map((item) => [item.label, item.state]),
  );

describe('reading image facts from project bytes', () => {
  it('reads PNG size and whether it can store transparency', () => {
    expect(readImageFacts(png(400, 50, 6))).toMatchObject({
      format: 'png',
      width: 400,
      height: 50,
      canBeTransparent: true,
    });
    expect(readImageFacts(png(500, 70, 2))?.canBeTransparent).toBe(false);
    expect(
      readImageFacts(png(500, 70, 2, chunk('tRNS', [0, 0, 0, 0, 0, 0])))?.canBeTransparent,
    ).toBe(true);
  });
  it('reads JPEG size from the frame header', () => {
    expect(readImageFacts(jpeg(300, 200))).toMatchObject({
      format: 'jpeg',
      width: 300,
      height: 200,
    });
  });
  it('reads GIF frames, delays and disposal', () => {
    const facts = readImageFacts(gif(200, 200, [75, 75, 75]))!;
    expect(facts).toMatchObject({ format: 'gif', width: 200, height: 200, canBeTransparent: true });
    expect(facts.frames).toEqual([
      { delayMs: 750, disposal: 2 },
      { delayMs: 750, disposal: 2 },
      { delayMs: 750, disposal: 2 },
    ]);
  });
  it('rejects bytes that are not an image', () => {
    expect(readImageFacts(new Uint8Array(text('<html></html>')))).toBeNull();
    expect(readImageFacts(new Uint8Array([0x89, 0x50]))).toBeNull();
  });
});

describe('comparing a project image with the paper', () => {
  const dab: CatalogGraphic = {
    file: 'dab.jpg',
    page: 3,
    formats: ['jpeg'],
    width: 300,
    original: { width: 1280, height: 853 },
  };
  it('computes the proportional side and allows the criteria tolerance', () => {
    expect(proportionalSize(dab)).toEqual({ side: 'height', value: 200 });
    expect(states(dab, [file('dab.jpg', jpeg(300, 200))])).toEqual({
      Format: 'ok',
      Szerokość: 'ok',
      Proporcje: 'ok',
    });
    expect(states(dab, [file('dab.jpg', jpeg(300, 204))]).Proporcje).toBe('ok');
    expect(states(dab, [file('dab.jpg', jpeg(300, 300))]).Proporcje).toBe('wrong');
    expect(states(dab, [file('dab.jpg', jpeg(301, 200))]).Szerokość).toBe('wrong');
  });
  it('reports a missing file, a case difference and a renamed format', () => {
    expect(checkGraphic(dab, []).facts).toBeUndefined();
    expect(checkGraphic(dab, [file('Dab.jpg', jpeg(300, 200))]).wrongCase).toBe(true);
    const renamed = states(dab, [file('dab.jpg', png(300, 200, 2))]);
    expect(renamed.Format).toBe('wrong');
    expect(renamed.Rozszerzenie).toBe('wrong');
  });
  it('matches a name printed without an extension and asks for transparency', () => {
    const logo: CatalogGraphic = {
      file: 'logo',
      page: 2,
      formats: ['png', 'gif'],
      width: 100,
      height: 100,
      transparent: true,
    };
    expect(states(logo, [file('logo.png', png(100, 100, 6))])).toEqual({
      Format: 'ok',
      Szerokość: 'ok',
      Wysokość: 'ok',
      Przezroczystość: 'look',
    });
    expect(states(logo, [file('logo.jpg', jpeg(100, 100))]).Przezroczystość).toBe('wrong');
  });
  it('checks animation frames and delays', () => {
    const cyfry: CatalogGraphic = {
      file: 'cyfry.gif',
      page: 3,
      formats: ['gif'],
      width: 200,
      height: 200,
      frames: 16,
      frameDelayMs: 750,
    };
    expect(states(cyfry, [file('cyfry.gif', gif(200, 200, Array(16).fill(75)))])).toMatchObject({
      Klatki: 'ok',
      'Czas klatki': 'ok',
    });
    const fewer = states(cyfry, [file('cyfry.gif', gif(200, 200, Array(15).fill(75)))]);
    expect(fewer.Klatki).toBe('wrong');
    const slower = states(cyfry, [file('cyfry.gif', gif(200, 200, [...Array(15).fill(75), 100]))]);
    expect(slower.Klatki).toBe('ok');
    expect(slower['Czas klatki']).toBe('wrong');
  });
  it('treats the background as transparent only when a corner pixel is', () => {
    expect(transparencyFromCorners([255, 255, 0, 255]).state).toBe('ok');
    expect(transparencyFromCorners([255, 255, 255, 255]).state).toBe('wrong');
  });
});

describe('catalogue image requirements', () => {
  it('every reviewed paper lists its graphics, and each is a file to hand in', () => {
    for (const entry of catalog) {
      expect(entry.graphics?.length, entry.id).toBeGreaterThan(0);
      const handIn = new Set(entry.handIn!.files);
      for (const graphic of entry.graphics!) {
        expect(handIn.has(graphic.file), `${entry.id}: ${graphic.file}`).toBe(true);
        expect(
          graphic.width ?? graphic.height ?? graphic.transparent ?? graphic.frames,
        ).toBeDefined();
        if (graphic.original) expect(proportionalSize(graphic), graphic.file).toBeDefined();
      }
    }
  });
  it('keeps the expected sizes the criteria print', () => {
    const graphic = (id: string, name: string) =>
      catalog.find((entry) => entry.id === id)!.graphics!.find((item) => item.file === name)!;
    expect(proportionalSize(graphic('inf03-02-25-06-sg', 'obraz.jpg'))).toEqual({
      side: 'width',
      value: 458,
    });
    expect(proportionalSize(graphic('inf03-12-26-06-sg', '1.jpg'))).toEqual({
      side: 'height',
      value: 306,
    });
    expect(proportionalSize(graphic('inf03-11-26-06-sg', 'dab.jpg'))).toEqual({
      side: 'height',
      value: 200,
    });
  });
});

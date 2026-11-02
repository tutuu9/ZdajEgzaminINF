import { MAX_EXTRACTED_BYTES, MAX_PROJECT_FILES } from '@zdaj/shared';

export function safePath(path: string): string {
  if (
    !path ||
    path.length > 240 ||
    path.includes('\\') ||
    path.startsWith('/') ||
    path.includes(':') ||
    [...path].some(
      (character) => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127,
    ) ||
    path.split('/').some((part) => part === '..' || part === '.' || !part)
  )
    throw new Error(`Niedozwolona ścieżka pliku: ${path.slice(0, 80)}`);
  return path;
}

interface Entry {
  name: string;
  method: number;
  size: number;
  compressedSize: number;
  dataOffset: number;
  crc: number;
}
const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(bytes: Uint8Array) {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = crcTable[(crc ^ byte) & 0xff]! ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function readEntries(bytes: Uint8Array, limit: number): Entry[] {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const u16 = (offset: number) => view.getUint16(offset, true),
    u32 = (offset: number) => view.getUint32(offset, true);
  const invalid = () => new Error('Archiwum ZIP jest uszkodzone albo ma nieobsługiwany format.');
  if (bytes.length < 22) throw invalid();
  let end = bytes.length - 22;
  while (end >= Math.max(0, bytes.length - 65557) && u32(end) !== 0x06054b50) end--;
  if (end < 0 || end < bytes.length - 65557 || end + 22 + u16(end + 20) !== bytes.length)
    throw invalid();
  const count = u16(end + 10),
    directorySize = u32(end + 12),
    directoryOffset = u32(end + 16);
  if (
    u16(end + 4) !== 0 ||
    u16(end + 6) !== 0 ||
    u16(end + 8) !== count ||
    count === 65535 ||
    directoryOffset === 0xffffffff ||
    directorySize === 0xffffffff ||
    directoryOffset + directorySize > end
  )
    throw invalid();
  if (count > MAX_PROJECT_FILES + 100) throw new Error('Archiwum ma zbyt wiele wpisów.');
  const entries: Entry[] = [];
  const names = new Set<string>();
  let offset = directoryOffset,
    total = 0;
  for (let index = 0; index < count; index++) {
    if (offset + 46 > end || u32(offset) !== 0x02014b50) throw invalid();
    const flags = u16(offset + 8),
      method = u16(offset + 10),
      crc = u32(offset + 16),
      compressedSize = u32(offset + 20),
      size = u32(offset + 24),
      nameLength = u16(offset + 28),
      extraLength = u16(offset + 30),
      commentLength = u16(offset + 32),
      localOffset = u32(offset + 42);
    const next = offset + 46 + nameLength + extraLength + commentLength;
    if (
      next > directoryOffset + directorySize ||
      u16(offset + 34) !== 0 ||
      size === 0xffffffff ||
      compressedSize === 0xffffffff ||
      (flags & 1) !== 0 ||
      ![0, 8].includes(method)
    )
      throw invalid();
    const name = new TextDecoder('utf-8', { fatal: true }).decode(
      bytes.subarray(offset + 46, offset + 46 + nameLength),
    );
    const unixMode = u32(offset + 38) >>> 16;
    if ((unixMode & 0xf000) === 0xa000)
      throw new Error('Archiwum nie może zawierać dowiązań symbolicznych.');
    if (name.endsWith('/')) {
      safePath(name.slice(0, -1));
      offset = next;
      continue;
    }
    safePath(name);
    if (/\.(zip|7z|rar|tar|gz)$/i.test(name))
      throw new Error('Archiwum nie może zawierać kolejnego archiwum.');
    if (names.has(name.toLocaleLowerCase('pl')))
      throw new Error('Nazwy plików w archiwum nie mogą się powtarzać.');
    names.add(name.toLocaleLowerCase('pl'));
    total += size;
    if (entries.length >= MAX_PROJECT_FILES || total > limit)
      throw new Error('Archiwum przekracza limit 500 plików lub 50 MiB po rozpakowaniu.');
    if (
      localOffset + 30 > directoryOffset ||
      u32(localOffset) !== 0x04034b50 ||
      u16(localOffset + 8) !== method ||
      u16(localOffset + 6) !== flags
    )
      throw invalid();
    const localNameLength = u16(localOffset + 26),
      localExtraLength = u16(localOffset + 28),
      dataOffset = localOffset + 30 + localNameLength + localExtraLength;
    if (
      dataOffset + compressedSize > directoryOffset ||
      new TextDecoder('utf-8', { fatal: true }).decode(
        bytes.subarray(localOffset + 30, localOffset + 30 + localNameLength),
      ) !== name ||
      (method === 0 && size !== compressedSize)
    )
      throw invalid();
    entries.push({ name, method, size, compressedSize, dataOffset, crc });
    offset = next;
  }
  if (offset !== directoryOffset + directorySize) throw invalid();
  return entries;
}

/** Metadata is checked before allocation; streaming decompression enforces actual size too. */
export async function extractBrowserZip(
  bytes: Uint8Array,
  limit = MAX_EXTRACTED_BYTES,
): Promise<Record<string, Uint8Array>> {
  let entries: Entry[];
  try {
    entries = readEntries(bytes, limit);
  } catch (error) {
    if (error instanceof RangeError) throw new Error('Archiwum ZIP jest uszkodzone.');
    throw error;
  }
  const files: Record<string, Uint8Array> = Object.create(null) as Record<string, Uint8Array>;
  for (const entry of entries) {
    const compressed = bytes.subarray(entry.dataOffset, entry.dataOffset + entry.compressedSize);
    let content: Uint8Array;
    if (entry.method === 0) content = compressed.slice();
    else {
      let decompressor: DecompressionStream;
      try {
        decompressor = new DecompressionStream('deflate-raw');
      } catch {
        throw new Error(
          'Ta przeglądarka nie obsługuje bezpiecznego odczytu ZIP. Rozpakuj archiwum we własnej IDE i wczytaj pliki.',
        );
      }
      const reader = new Blob([compressed as Uint8Array<ArrayBuffer>])
        .stream()
        .pipeThrough(decompressor)
        .getReader();
      const chunks: Uint8Array[] = [];
      let length = 0;
      try {
        for (;;) {
          const chunk = await reader.read();
          if (chunk.done) break;
          length += chunk.value.length;
          if (length > entry.size || length > limit) {
            await reader.cancel();
            throw new Error(
              'Rzeczywisty rozmiar pliku nie zgadza się z archiwum lub przekracza limit.',
            );
          }
          chunks.push(chunk.value);
        }
      } catch (error) {
        await reader.cancel().catch(() => undefined);
        throw error;
      }
      if (length !== entry.size)
        throw new Error('Archiwum zawiera plik o nieprawidłowym rozmiarze.');
      content = new Uint8Array(length);
      let offset = 0;
      for (const chunk of chunks) {
        content.set(chunk, offset);
        offset += chunk.length;
      }
    }
    if (crc32(content) !== entry.crc)
      throw new Error('Archiwum jest uszkodzone: suma kontrolna pliku nie zgadza się.');
    files[entry.name] = content;
  }
  return files;
}

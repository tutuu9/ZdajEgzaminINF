import path from 'node:path';
import yauzl from 'yauzl';
import {
  MAX_EXTRACTED_BYTES,
  MAX_PROJECT_FILES,
  MAX_UPLOAD_BYTES,
  type ProjectFile,
} from '@zdaj/shared';

const binaryExtensions = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico']);
const allowedExtensions = new Set([
  '.html',
  '.htm',
  '.css',
  '.js',
  '.mjs',
  '.json',
  '.txt',
  '.sql',
  '.php',
  '.svg',
  '.md',
  ...binaryExtensions,
]);
export function validatePath(filePath: string): string {
  if (
    !filePath ||
    filePath.length > 240 ||
    // Control characters are deliberately forbidden in archive entry names.
    // eslint-disable-next-line no-control-regex
    /[\\\x00-\x1f:]/u.test(filePath) ||
    path.posix.isAbsolute(filePath)
  )
    throw new Error('Niedozwolona ścieżka pliku.');
  const segments = filePath.split('/');
  if (
    segments.some(
      (segment) =>
        !segment ||
        segment === '.' ||
        segment === '..' ||
        segment.startsWith('.') ||
        /[. ]$/.test(segment) ||
        /^(con|prn|aux|nul|com[0-9]|lpt[0-9])(?:\.|$)/i.test(segment),
    )
  )
    throw new Error('Niedozwolona nazwa pliku lub katalogu.');
  if (!allowedExtensions.has(path.posix.extname(filePath).toLowerCase()))
    throw new Error(`Nieobsługiwany typ pliku: ${filePath}`);
  return filePath;
}
export function fileBuffer(file: ProjectFile): Buffer {
  if (file.encoding === 'base64') {
    if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(file.content))
      throw new Error('Nieprawidłowa zawartość pliku binarnego.');
    return Buffer.from(file.content, 'base64');
  }
  return Buffer.from(file.content, 'utf8');
}
export function validateProjectFiles(value: unknown): ProjectFile[] {
  if (!Array.isArray(value) || value.length === 0 || value.length > MAX_PROJECT_FILES)
    throw new Error('Projekt musi zawierać od 1 do 500 plików.');
  const names = new Set<string>();
  let total = 0;
  return value.map((file: unknown) => {
    if (!file || typeof file !== 'object') throw new Error('Nieprawidłowy plik projektu.');
    const candidate = file as ProjectFile;
    if (
      typeof candidate.path !== 'string' ||
      typeof candidate.content !== 'string' ||
      (candidate.encoding !== undefined && !['utf8', 'base64'].includes(candidate.encoding))
    )
      throw new Error('Nieprawidłowy format pliku.');
    validatePath(candidate.path);
    const name = candidate.path.toLowerCase();
    if (names.has(name)) throw new Error('Projekt zawiera powtarzające się nazwy plików.');
    names.add(name);
    const buffer = fileBuffer(candidate);
    total += buffer.length;
    if (buffer.length > MAX_UPLOAD_BYTES || total > MAX_EXTRACTED_BYTES)
      throw new Error('Projekt przekracza limit wielkości.');
    if (binaryExtensions.has(path.posix.extname(name)) && candidate.encoding !== 'base64')
      throw new Error('Obraz musi być przesłany jako plik binarny.');
    return {
      path: candidate.path,
      content: candidate.content,
      encoding: candidate.encoding ?? 'utf8',
    };
  });
}
export async function extractZip(buffer: Buffer): Promise<ProjectFile[]> {
  if (buffer.length > MAX_UPLOAD_BYTES) throw new Error('Archiwum może mieć maksymalnie 10 MiB.');
  return new Promise((resolve, reject) => {
    yauzl.fromBuffer(
      buffer,
      { lazyEntries: true, validateEntrySizes: true, strictFileNames: true },
      (error, zip) => {
        if (error || !zip) {
          reject(new Error('Nie można odczytać archiwum ZIP.'));
          return;
        }
        const files: ProjectFile[] = [];
        let total = 0;
        let entries = 0;
        let settled = false;
        const fail = (reason: unknown) => {
          if (settled) return;
          settled = true;
          zip.close();
          reject(reason instanceof Error ? reason : new Error('Nieprawidłowe archiwum.'));
        };
        zip.on('error', fail);
        zip.on('entry', (entry: yauzl.Entry) => {
          try {
            entries++;
            if (entries > 1000 || files.length >= MAX_PROJECT_FILES)
              throw new Error('Archiwum zawiera zbyt wiele plików.');
            const type = (entry.externalFileAttributes >>> 16) & 0o170000;
            if (type === 0o120000 || (type !== 0 && type !== 0o100000 && type !== 0o040000))
              throw new Error('Dowiązania i pliki specjalne nie są obsługiwane.');
            if (entry.generalPurposeBitFlag & 1) throw new Error('Prześlij ZIP bez hasła.');
            if (entry.fileName.endsWith('/')) {
              validatePath(`${entry.fileName}directory.txt`);
              zip.readEntry();
              return;
            }
            validatePath(entry.fileName);
            if (
              entry.uncompressedSize > MAX_UPLOAD_BYTES ||
              total + entry.uncompressedSize > MAX_EXTRACTED_BYTES
            )
              throw new Error('Rozpakowany projekt przekracza limit wielkości.');
            zip.openReadStream(entry, (streamError, stream) => {
              if (streamError || !stream) {
                fail(streamError ?? new Error('Nie można odczytać pliku.'));
                return;
              }
              const chunks: Buffer[] = [];
              let size = 0;
              stream.on('data', (chunk: Buffer) => {
                size += chunk.length;
                total += chunk.length;
                if (size > MAX_UPLOAD_BYTES || total > MAX_EXTRACTED_BYTES) {
                  stream.destroy();
                  fail(new Error('Rozpakowany projekt przekracza limit wielkości.'));
                  return;
                }
                chunks.push(chunk);
              });
              stream.on('error', fail);
              stream.on('end', () => {
                if (settled) return;
                const data = Buffer.concat(chunks);
                const binary = binaryExtensions.has(
                  path.posix.extname(entry.fileName).toLowerCase(),
                );
                files.push({
                  path: entry.fileName,
                  content: data.toString(binary ? 'base64' : 'utf8'),
                  encoding: binary ? 'base64' : 'utf8',
                });
                zip.readEntry();
              });
            });
          } catch (reason) {
            fail(reason);
          }
        });
        zip.on('end', () => {
          if (settled) return;
          try {
            // A single enclosing project folder is common when exporting from an IDE.
            const first = files[0]?.path.split('/')[0];
            const wrapped = first && files.every((file) => file.path.startsWith(`${first}/`));
            const normalized = wrapped
              ? files.map((file) => ({ ...file, path: file.path.slice(first.length + 1) }))
              : files;
            const valid = validateProjectFiles(normalized);
            settled = true;
            resolve(valid);
          } catch (reason) {
            fail(reason);
          }
        });
        zip.readEntry();
      },
    );
  });
}

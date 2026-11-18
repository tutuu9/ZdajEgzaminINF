import {
  BadGatewayException,
  HttpException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { createHash } from 'node:crypto';

interface ReviewedExamSource {
  url: string;
  sourceLabel: string;
  provenance: 'official-source' | 'archive-copy';
  sha256?: string;
}

// Deliberate code-reviewed allowlist. Admin-entered catalogue URLs never become proxy targets.
export const REVIEWED_EXAM_PDFS: Readonly<Record<string, ReviewedExamSource>> = Object.freeze({
  'cke-inf03-informator-2022': {
    url: 'https://bip.cke.gov.pl/attachments/download/8580',
    sourceLabel: 'CKE — informator technik programista, przykładowe pytania INF.03',
    provenance: 'official-source',
    sha256: '4db0fbf07b802fa4d5121baa701f15045f6b6c2e74a17be5fc3c9f2831873cc5',
  },
  'cke-wedkowanie': {
    url: 'https://cke.gov.pl/images/_EGZAMIN_ZAWODOWY/Formula_2019/Przykladowe_zadania/inf_03.pdf',
    sourceLabel: 'Centralna Komisja Egzaminacyjna — oficjalny przykład',
    provenance: 'official-source',
  },
  'inf03-01-25-01-sg': {
    url: 'https://nuwaflrhlwnsdvnciltx.supabase.co/storage/v1/object/public/kursinf_main/exam_sheets/inf03/1753367876245_sheet.pdf',
    sourceLabel: 'KURSINF — kopia arkusza INF.03-01-25.01-SG',
    provenance: 'archive-copy',
  },
  'inf03-08-25-06-sg': {
    url: 'https://nuwaflrhlwnsdvnciltx.supabase.co/storage/v1/object/public/kursinf_main/exam_sheets/inf03/1761142765209_sheet.pdf',
    sourceLabel: 'KURSINF — kopia arkusza INF.03-08-25.06-SG',
    provenance: 'archive-copy',
  },
  'inf03-01-24-06-sg': {
    url: 'https://nuwaflrhlwnsdvnciltx.supabase.co/storage/v1/object/public/kursinf_main/exam_sheets/inf03/1753444633550_sheet.pdf',
    sourceLabel: 'Kopia archiwalna CKE — INF.03-01-24.06-SG',
    provenance: 'archive-copy',
    sha256: '87a33c12040b7a958ae97dbbd71a99472bdb83019dcc34731e0fe7d467a32b67',
  },
  'inf03-03-24-06-sg': {
    url: 'https://nuwaflrhlwnsdvnciltx.supabase.co/storage/v1/object/public/kursinf_main/exam_sheets/inf03/1753525727422_sheet.pdf',
    sourceLabel: 'Kopia archiwalna CKE — INF.03-03-24.06-SG',
    provenance: 'archive-copy',
    sha256: '66d22d97430a9d33d5af2a34684a92aa5f41890fcd5a26bb08cc838e9a89375f',
  },
  'inf03-01-24-01-sg': {
    url: 'https://nuwaflrhlwnsdvnciltx.supabase.co/storage/v1/object/public/kursinf_main/exam_sheets/inf03/1753704828595_sheet.pdf',
    sourceLabel: 'Kopia archiwalna CKE — INF.03-01-24.01-SG',
    provenance: 'archive-copy',
    sha256: '875fd2ae7d10aafcaaa9679d86be3e9c684c875189eb4cf9d2d96156cb7de939',
  },
  'inf03-05-24-01-sg': {
    url: 'https://edu-update.pl/wp-content/uploads/2025/10/inf_03_2024_01_05_SG_kolor.pdf',
    sourceLabel: 'Kopia archiwalna CKE — INF.03-05-24.01-SG',
    provenance: 'archive-copy',
    sha256: 'bdb5e3db8975e1faf127b8a15eaa870fede97b06a5af28479d7e807a7e98eaa5',
  },
  'inf03-02-24-06-sg': {
    url: 'https://nuwaflrhlwnsdvnciltx.supabase.co/storage/v1/object/public/kursinf_main/exam_sheets/inf03/1753525305768_sheet.pdf',
    sourceLabel: 'Kopia archiwalna CKE — INF.03-02-24.06-SG',
    provenance: 'archive-copy',
    sha256: '3e9839d4a9087cbb4510624e7795692e363d03c2cf4115b8796040196feb8301',
  },
  'inf03-02-25-06-sg': {
    url: 'https://nuwaflrhlwnsdvnciltx.supabase.co/storage/v1/object/public/kursinf_main/exam_sheets/inf03/1761141596091_sheet.pdf',
    sourceLabel: 'Kopia archiwalna CKE — INF.03-02-25.06-SG',
    provenance: 'archive-copy',
    sha256: 'f1fa2eb78660104e0fc402672b984f771fa4e2932b7636acc754b13b82bc5e37',
  },
  'inf03-06-25-01-sg': {
    url: 'https://nuwaflrhlwnsdvnciltx.supabase.co/storage/v1/object/public/kursinf_main/exam_sheets/inf03/1753370456641_sheet.pdf',
    sourceLabel: 'Kopia archiwalna CKE — INF.03-06-25.01-SG',
    provenance: 'archive-copy',
    sha256: '55da817ce0badf21157a9e7c54feb005443768641e03d4d63e16744f1dfdcb26',
  },
  'inf03-02-25-01-sg': {
    url: 'https://nuwaflrhlwnsdvnciltx.supabase.co/storage/v1/object/public/kursinf_main/exam_sheets/inf03/1753368464417_sheet.pdf',
    sourceLabel: 'Kopia archiwalna CKE — INF.03-02-25.01-SG',
    provenance: 'archive-copy',
    sha256: '5c52d74efe881e721b28c0d648dad08d05bb8a65a1fb1741bc7ce3831c797e6e',
  },
  'inf03-11-26-06-sg': {
    url: 'https://nuwaflrhlwnsdvnciltx.supabase.co/storage/v1/object/public/kursinf_main/exam_sheets/inf03/1788193419002_ocmp1w_sheet.pdf',
    sourceLabel: 'Kopia archiwalna CKE — INF.03-11-26.06-SG',
    provenance: 'archive-copy',
    sha256: 'a6c2ac8e6951791320fe7868e83e20355054a16b95ece22fa13c9608f06ec6a3',
  },
});
const MAX_PDF_BYTES = 10 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 25_000;
let activeDownloads = 0;

/**
 * Joins simultaneous loads of one key and keeps a few results in memory for a short time.
 * Failures are never kept, so the next request tries the source again.
 */
export function createBriefCache<T>(ttlMs: number, maxEntries: number) {
  const ready = new Map<string, { value: T; expires: number }>();
  const pending = new Map<string, Promise<T>>();
  return async (key: string, load: () => Promise<T>): Promise<T> => {
    const hit = ready.get(key);
    if (hit && hit.expires > Date.now()) return hit.value;
    ready.delete(key);
    const running = pending.get(key);
    if (running) return running;
    const job = load()
      .then((value) => {
        ready.set(key, { value, expires: Date.now() + ttlMs });
        // Map keeps insertion order, so the first key is the oldest.
        while (ready.size > maxEntries) ready.delete(ready.keys().next().value!);
        return value;
      })
      .finally(() => pending.delete(key));
    pending.set(key, job);
    return job;
  };
}
// Every theory question is a crop of one pinned document. Without this, each learner who
// opens a question starts another multi-megabyte download and the third one is refused.
const pinnedSheets = createBriefCache<Buffer>(10 * 60_000, 3);

/**
 * Returns the exact reviewed source bytes without rewriting them. Nothing is written to
 * disk. Only documents pinned by SHA-256 are held in memory, briefly: their bytes cannot
 * differ between requests. Unpinned sources are fetched every time.
 */
export async function originalExamSheet(id: string) {
  const source = Object.hasOwn(REVIEWED_EXAM_PDFS, id) ? REVIEWED_EXAM_PDFS[id] : undefined;
  if (!source)
    throw new NotFoundException('Nie potwierdzono bezpośredniego źródła PDF dla tego arkusza.');
  const bytes = source.sha256
    ? await pinnedSheets(id, () => downloadExamSheet(source))
    : await downloadExamSheet(source);
  return { bytes, source };
}
async function downloadExamSheet(source: ReviewedExamSource) {
  if (activeDownloads >= 2)
    throw new HttpException('Trwa pobieranie innych arkuszy. Spróbuj ponownie za chwilę.', 429);
  activeDownloads++;
  try {
    const response = await fetch(source.url, {
      redirect: 'manual',
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: { Accept: 'application/pdf' },
    });
    const contentType = response.headers.get('content-type')?.split(';')[0]?.trim().toLowerCase();
    const length = Number(response.headers.get('content-length') ?? '0');
    if (
      !response.ok ||
      response.status >= 300 ||
      !['application/pdf', 'application/octet-stream'].includes(contentType ?? '') ||
      !Number.isFinite(length) ||
      length < 0 ||
      length > MAX_PDF_BYTES ||
      !response.body
    ) {
      await response.body?.cancel();
      throw new BadGatewayException(
        'Źródło nie udostępniło poprawnego PDF. Otwórz odnośnik do źródła lub spróbuj później.',
      );
    }
    const reader = response.body.getReader();
    const chunks: Buffer[] = [];
    let size = 0;
    try {
      while (true) {
        const item = await reader.read();
        if (item.done) break;
        size += item.value.byteLength;
        if (size > MAX_PDF_BYTES) {
          await reader.cancel();
          throw new BadGatewayException('PDF ze źródła przekracza limit bezpiecznego podglądu.');
        }
        chunks.push(Buffer.from(item.value));
      }
    } finally {
      reader.releaseLock();
    }
    const bytes = Buffer.concat(chunks, size);
    if (bytes.subarray(0, 5).toString('ascii') !== '%PDF-')
      throw new BadGatewayException('Odpowiedź źródła nie jest plikiem PDF.');
    if (source.sha256 && createHash('sha256').update(bytes).digest('hex') !== source.sha256)
      throw new BadGatewayException(
        'Dokument źródłowy zmienił się. Wymaga ponownej weryfikacji przed udostępnieniem podglądu.',
      );
    return bytes;
  } catch (error) {
    if (error instanceof HttpException) throw error;
    throw new ServiceUnavailableException(
      'Nie udało się pobrać oryginalnego arkusza. Skorzystaj z odnośnika do źródła.',
    );
  } finally {
    activeDownloads--;
  }
}

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
});
const MAX_PDF_BYTES = 10 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 25_000;
let activeDownloads = 0;

/** Returns the exact reviewed source bytes, without rewriting or retaining an exam copy. */
export async function originalExamSheet(id: string) {
  const source = Object.hasOwn(REVIEWED_EXAM_PDFS, id) ? REVIEWED_EXAM_PDFS[id] : undefined;
  if (!source)
    throw new NotFoundException('Nie potwierdzono bezpośredniego źródła PDF dla tego arkusza.');
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
        'Dokument źródłowy zmienił się. Pytania wymagają ponownej weryfikacji przed udostępnieniem podglądu.',
      );
    return { bytes, source };
  } catch (error) {
    if (error instanceof HttpException) throw error;
    throw new ServiceUnavailableException(
      'Nie udało się pobrać oryginalnego arkusza. Skorzystaj z odnośnika do źródła.',
    );
  } finally {
    activeDownloads--;
  }
}

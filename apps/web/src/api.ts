let csrfToken = '';

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

export async function initializeSession(): Promise<void> {
  const response = await fetch('/api/v1/session', { credentials: 'include' });
  if (!response.ok)
    throw new ApiError(
      'Nie udało się połączyć z serwerem. Spróbuj ponownie za chwilę.',
      response.status,
    );
  const data = (await response.json()) as { csrfToken: string };
  csrfToken = data.csrfToken;
}

export async function api<T>(
  path: string,
  options: { method?: string; body?: unknown; headers?: Record<string, string> } = {},
): Promise<T> {
  const method = options.method ?? 'GET';
  if (method !== 'GET' && !csrfToken) await initializeSession();
  const isForm = options.body instanceof FormData;
  let response: Response;
  try {
    response = await fetch(`/api/v1${path}`, {
      method,
      credentials: 'include',
      headers: {
        ...(options.body && !isForm ? { 'Content-Type': 'application/json' } : {}),
        ...(method !== 'GET' ? { 'X-CSRF-Token': csrfToken } : {}),
        ...options.headers,
      },
      body:
        options.body === undefined
          ? undefined
          : isForm
            ? (options.body as FormData)
            : JSON.stringify(options.body),
    });
  } catch {
    throw new ApiError(
      'Brak połączenia z serwerem. Twoje zapisane projekty pozostają w tej przeglądarce.',
      0,
    );
  }
  if (!response.ok) {
    let message = 'Nie udało się wykonać tej czynności. Spróbuj ponownie.';
    try {
      const error = (await response.json()) as { message?: string | string[] };
      if (error.message)
        message = Array.isArray(error.message) ? error.message.join(' ') : error.message;
    } catch {
      /* Non-JSON gateway response. */
    }
    throw new ApiError(message, response.status);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : 'Wystąpił błąd. Spróbuj ponownie.';

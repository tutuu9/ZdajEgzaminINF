import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

beforeEach(() => vi.resetModules());
afterEach(() => vi.unstubAllGlobals());

describe('one guest cookie and CSRF exchange', () => {
  it('coalesces concurrent initialization and first mutations without creating extra guests', async () => {
    let release!: (response: Response) => void;
    const session = new Promise<Response>((resolve) => {
      release = resolve;
    });
    const fetch = vi.fn(async (url: string, options?: RequestInit) => {
      if (url === '/api/v1/session') return session;
      expect(new Headers(options?.headers).get('X-CSRF-Token')).toBe('one-session-token');
      expect(options?.credentials).toBe('include');
      return Response.json({ accepted: true });
    });
    vi.stubGlobal('fetch', fetch);
    const { initializeSession, api } = await import('../apps/web/src/api');
    const first = initializeSession();
    const second = initializeSession();
    const mutation = api('/attempts', { method: 'POST', body: { taskId: 'test' } });
    expect(first).toBe(second);
    expect(fetch).toHaveBeenCalledTimes(1);
    release(Response.json({ csrfToken: 'one-session-token' }));
    await Promise.all([first, second, mutation]);
    expect(fetch.mock.calls.map(([url]) => url)).toEqual(['/api/v1/session', '/api/v1/attempts']);
  });

  it('propagates a failed exchange to all callers and allows the next explicit retry', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 429 }))
      .mockResolvedValueOnce(Response.json({ csrfToken: 'recovered-token' }));
    vi.stubGlobal('fetch', fetch);
    const { initializeSession } = await import('../apps/web/src/api');
    const results = await Promise.allSettled([initializeSession(), initializeSession()]);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(
      results.every((result) => result.status === 'rejected' && result.reason.status === 429),
    ).toBe(true);
    await expect(initializeSession()).resolves.toBeUndefined();
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('does not replay a rejected mutation or bypass server CSRF protection', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ csrfToken: 'valid-initial-token' }))
      .mockResolvedValueOnce(Response.json({ message: 'Token wygasł.' }, { status: 403 }));
    vi.stubGlobal('fetch', fetch);
    const { api } = await import('../apps/web/src/api');
    await expect(api('/attempts', { method: 'POST', body: {} })).rejects.toMatchObject({
      status: 403,
    });
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('waits for an ongoing refresh before sending a mutation with the old token', async () => {
    let release!: (response: Response) => void;
    const refreshing = new Promise<Response>((resolve) => {
      release = resolve;
    });
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ csrfToken: 'old-token' }))
      .mockImplementationOnce(() => refreshing)
      .mockResolvedValueOnce(Response.json({ accepted: true }));
    vi.stubGlobal('fetch', fetch);
    const { initializeSession, api } = await import('../apps/web/src/api');
    await initializeSession();
    const refresh = initializeSession();
    const mutation = api('/attempts', { method: 'POST', body: {} });
    expect(fetch).toHaveBeenCalledTimes(2);
    release(Response.json({ csrfToken: 'new-token' }));
    await Promise.all([refresh, mutation]);
    const options = fetch.mock.calls[2]![1] as RequestInit;
    expect(new Headers(options.headers).get('X-CSRF-Token')).toBe('new-token');
  });
});

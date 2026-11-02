import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { ForbiddenException, HttpException, UnauthorizedException } from '@nestjs/common';
import type { Request, Response } from 'express';
import { db, Prisma } from '@zdaj/database';
import { config, DAY_MS } from './config.js';

export const hash = (value: string): string => createHash('sha256').update(value).digest('hex');
export const secretToken = (): string => randomBytes(32).toString('base64url');
export function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}
const csrfFor = (cookie: string) =>
  createHmac('sha256', config.secret).update(`csrf:${cookie}`).digest('base64url');
const cookieOptions = {
  httpOnly: true,
  secure: config.production,
  sameSite: 'strict' as const,
  path: '/',
};
const protectedRequests = new WeakSet<Request>();
export const guestCookie = 'zdaj_guest';
export const adminCookie = 'zdaj_admin';

export function requestIpKey(req: Request): string {
  const day = new Date().toISOString().slice(0, 10);
  return createHmac('sha256', config.ipSecret ?? config.secret)
    .update(`${day}:${req.ip ?? req.socket.remoteAddress ?? 'unknown'}`)
    .digest('hex');
}
export async function rateLimit(key: string, maximum: number, durationMs: number): Promise<void> {
  const expiresAt = new Date(Date.now() + durationMs);
  const rows = await db.$queryRaw<{ count: number }[]>(Prisma.sql`
    INSERT INTO "RateLimit" ("key", "count", "expiresAt") VALUES (${key}, 1, ${expiresAt})
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE WHEN "RateLimit"."expiresAt" < NOW() THEN 1 ELSE "RateLimit"."count" + 1 END,
      "expiresAt" = CASE WHEN "RateLimit"."expiresAt" < NOW() THEN EXCLUDED."expiresAt" ELSE "RateLimit"."expiresAt" END
    RETURNING "count"
  `);
  if ((rows[0]?.count ?? maximum + 1) > maximum)
    throw new HttpException('Osiągnięto limit tej funkcji. Spróbuj później.', 429);
}
export async function ensureGuest(req: Request, res: Response): Promise<{ csrfToken: string }> {
  let token = String(req.cookies?.[guestCookie] ?? '');
  let session = token ? await db.session.findUnique({ where: { tokenHash: hash(token) } }) : null;
  if (!session || session.kind !== 'guest' || session.expiresAt < new Date()) {
    await rateLimit(`session:${requestIpKey(req)}`, 30, 60_000);
    token = secretToken();
    session = await db.session.create({
      data: {
        tokenHash: hash(token),
        csrfHash: hash(csrfFor(token)),
        kind: 'guest',
        expiresAt: new Date(Date.now() + 7 * DAY_MS),
      },
    });
    res.cookie(guestCookie, token, { ...cookieOptions, maxAge: 7 * DAY_MS });
  }
  const csrfToken = csrfFor(token);
  if (session.csrfHash !== hash(csrfToken))
    await db.session.update({ where: { id: session.id }, data: { csrfHash: hash(csrfToken) } });
  return { csrfToken };
}
export async function guest(req: Request) {
  const token = String(req.cookies?.[guestCookie] ?? '');
  if (!token) throw new UnauthorizedException('Odśwież stronę, aby rozpocząć sesję.');
  const session = await db.session.findUnique({ where: { tokenHash: hash(token) } });
  if (!session || session.kind !== 'guest' || session.expiresAt < new Date())
    throw new UnauthorizedException('Sesja wygasła. Odśwież stronę.');
  return session;
}
export async function protectMutation(req: Request): Promise<void> {
  if (protectedRequests.has(req)) return;
  const origin = req.get('origin');
  if (origin && !config.origins.has(origin))
    throw new ForbiddenException('Niedozwolone źródło żądania.');
  if (req.get('sec-fetch-site') === 'cross-site')
    throw new ForbiddenException('Niedozwolone źródło żądania.');
  const session = await guest(req);
  const csrf = req.get('x-csrf-token') ?? '';
  if (!csrf || !safeEqual(hash(csrf), session.csrfHash))
    throw new ForbiddenException('Token bezpieczeństwa wygasł. Odśwież stronę.');
  protectedRequests.add(req);
}
export async function admin(req: Request) {
  const token = String(req.cookies?.[adminCookie] ?? '');
  if (!token) throw new UnauthorizedException('Zaloguj się jako administrator.');
  const session = await db.session.findUnique({ where: { tokenHash: hash(token) } });
  if (!session || session.kind !== 'admin' || !session.adminId || session.expiresAt < new Date())
    throw new UnauthorizedException('Sesja administratora wygasła.');
  const account = await db.admin.findUnique({ where: { id: session.adminId } });
  if (!account) throw new UnauthorizedException('Zaloguj się jako administrator.');
  return account;
}
export async function setAdminSession(accountId: string, res: Response): Promise<void> {
  const token = secretToken();
  await db.session.create({
    data: {
      tokenHash: hash(token),
      csrfHash: '',
      kind: 'admin',
      adminId: accountId,
      expiresAt: new Date(Date.now() + 8 * 3_600_000),
    },
  });
  res.cookie(adminCookie, token, { ...cookieOptions, maxAge: 8 * 3_600_000 });
}
export async function clearAdminSession(req: Request, res: Response): Promise<void> {
  const token = String(req.cookies?.[adminCookie] ?? '');
  if (token) await db.session.deleteMany({ where: { tokenHash: hash(token), kind: 'admin' } });
  res.clearCookie(adminCookie, cookieOptions);
}

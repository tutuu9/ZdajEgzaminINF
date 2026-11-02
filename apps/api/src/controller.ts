import {
  BadRequestException,
  NotFoundException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UploadedFile,
  UseInterceptors,
  UseGuards,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request, Response } from 'express';
import { memoryStorage } from 'multer';
import { extractZip } from '@zdaj/checker';
import { MAX_UPLOAD_BYTES, toPublicTask } from '@zdaj/shared';
import { z } from 'zod';
import { admin, clearAdminSession, ensureGuest, protectMutation } from './security.js';
import { parse } from './validation.js';
import { bootstrap, isCkeTask, taskVersion } from './content.js';
import {
  acknowledgeCheck,
  createAttempt,
  completePractice,
  getCheck,
  preparedHint,
  startTheory,
  submitCheck,
  submitTheory,
} from './attempts.js';
import { askAi, providerBalance, settleUncertain } from './ai.js';
import { createTaskSheet } from './task-pdf.js';
import { originalExamSheet } from './exam-pdf.js';
import { revealStudyGuide } from './study.js';
import { acknowledgeStudyCheck, getStudyCheck, submitStudyCheck } from './study-checks.js';
import {
  contentRows,
  createDraft,
  dashboard,
  importSources,
  login,
  previewSources,
  publishDraft,
  updateSettings,
  whoAmI,
} from './admin.js';

class CsrfGuard implements CanActivate {
  async canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest<Request>();
    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) await protectMutation(req);
    return true;
  }
}
@Controller('api/v1')
@UseGuards(CsrfGuard)
export class ApiController {
  @Get('health') health() {
    return { ok: true, service: 'zdaj-api' };
  }
  @Get('session') session(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    return ensureGuest(req, res);
  }
  @Get('bootstrap') bootstrap() {
    return bootstrap();
  }
  @Get('tasks/:id') async task(@Param('id') id: string, @Query('version') version?: string) {
    const task = await taskVersion(
      id,
      version === undefined ? undefined : parse(z.coerce.number().int().positive(), version),
    );
    if (version === undefined && !isCkeTask(task))
      throw new NotFoundException('To zadanie nie jest dostępne w aktualnym katalogu CKE.');
    return toPublicTask(task);
  }
  @Get('tasks/:id/sheet.pdf') async taskSheet(
    @Param('id') id: string,
    @Query('version') version: string | undefined,
    @Res() res: Response,
  ) {
    const task = await taskVersion(
      id,
      version === undefined ? undefined : parse(z.coerce.number().int().positive(), version),
    );
    if (task.origin === 'exam' && task.sourceCatalogId) {
      const { bytes, source } = await originalExamSheet(task.sourceCatalogId);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `inline; filename="${task.sourceCatalogId.replace(/[^a-zA-Z0-9._-]/g, '_')}-original.pdf"`,
      );
      res.setHeader('X-Pdf-Source-Url', source.url);
      res.setHeader('X-Pdf-Provenance', source.provenance);
      res.setHeader('Cache-Control', 'no-store');
      res.send(bytes);
      return;
    }
    if (version === undefined)
      throw new NotFoundException('Arkusz autorski nie jest częścią aktualnego katalogu CKE.');
    const pdf = await createTaskSheet(task);
    const safeId = task.id.replace(/[^a-zA-Z0-9._-]/g, '_');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${safeId}-v${task.version}.pdf"`);
    res.setHeader('X-Task-Version', String(task.version));
    res.send(pdf);
  }
  @Get('catalog/:id/sheet.pdf') async originalSheet(
    @Param('id') id: string,
    @Query() query: Record<string, unknown>,
    @Res() res: Response,
  ) {
    parse(z.object({}).strict(), query);
    const { bytes, source } = await originalExamSheet(id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${id}-original.pdf"`);
    res.setHeader('X-Pdf-Source-Url', source.url);
    res.setHeader('X-Pdf-Provenance', source.provenance);
    res.setHeader('Cache-Control', 'no-store');
    res.send(bytes);
  }
  @Post('attempts') async attempt(@Body() body: unknown, @Req() req: Request) {
    await protectMutation(req);
    return createAttempt(body, req);
  }
  @Post('attempts/:id/complete') async complete(@Param('id') id: string, @Body() body: unknown) {
    return completePractice(id, body);
  }
  @Post('attempts/:id/study') async study(@Param('id') id: string, @Body() body: unknown) {
    return revealStudyGuide(id, body);
  }
  @Post('attempts/:id/study/checks') async studyCheck(
    @Param('id') id: string,
    @Body() body: unknown,
    @Req() req: Request,
  ) {
    return submitStudyCheck(id, body, req);
  }
  @Get('study/checks/:id') studyCheckResult(@Param('id') id: string, @Req() req: Request) {
    return getStudyCheck(id, req.get('x-check-token') ?? '');
  }
  @Post('study/checks/:id/ack') studyCheckAck(@Param('id') id: string, @Body() body: unknown) {
    const value = parse(z.object({ token: z.string().max(100) }).strict(), body);
    return acknowledgeStudyCheck(id, value.token);
  }
  @Post('theory/start') async theoryStart(@Body() body: unknown, @Req() req: Request) {
    await protectMutation(req);
    return startTheory(body, req);
  }
  @Post('theory/:id/submit') async theorySubmit(
    @Param('id') id: string,
    @Body() body: unknown,
    @Req() req: Request,
  ) {
    await protectMutation(req);
    return submitTheory(id, body);
  }
  @Post('checks') async check(@Body() body: unknown, @Req() req: Request) {
    await protectMutation(req);
    const value = parse(
      z
        .object({ attemptId: z.string(), attemptToken: z.string().max(100), files: z.unknown() })
        .strict(),
      body,
    );
    return submitCheck(value.attemptId, value.attemptToken, value.files, req);
  }
  @Post('checks/upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_UPLOAD_BYTES, files: 1, fields: 3, fieldSize: 200 },
    }),
  )
  async upload(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() body: unknown,
    @Req() req: Request,
  ) {
    await protectMutation(req);
    const value = parse(
      z.object({ attemptId: z.string(), attemptToken: z.string().max(100) }).strict(),
      body,
    );
    if (!file || !file.originalname.toLowerCase().endsWith('.zip'))
      throw new BadRequestException('Wybierz archiwum ZIP.');
    let files;
    try {
      files = await extractZip(file.buffer);
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error ? error.message : 'Niepoprawne archiwum ZIP.',
      );
    }
    return submitCheck(value.attemptId, value.attemptToken, files, req);
  }
  @Get('checks/:id') checkResult(@Param('id') id: string, @Req() req: Request) {
    return getCheck(id, req.get('x-check-token') ?? '');
  }
  @Post('checks/:id/ack') async ack(
    @Param('id') id: string,
    @Body() body: unknown,
    @Req() req: Request,
  ) {
    await protectMutation(req);
    const value = parse(z.object({ token: z.string().max(100) }).strict(), body);
    return acknowledgeCheck(id, value.token);
  }
  @Post('hints') async hint(@Body() body: unknown, @Req() req: Request) {
    await protectMutation(req);
    return preparedHint(body);
  }
  @Post('ai') async ai(@Body() body: unknown, @Req() req: Request) {
    await protectMutation(req);
    return askAi(body, req);
  }
  @Post('exercises/:id/solution') async solution(@Param('id') id: string, @Req() req: Request) {
    await protectMutation(req);
    throw new NotFoundException(
      `Ćwiczenie ${id.slice(0, 100)} nie należy do aktualnego zestawu CKE.`,
    );
  }

  @Post('admin/login') async login(
    @Body() body: unknown,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    await protectMutation(req);
    return login(body, req, res);
  }
  @Post('admin/logout') async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    await protectMutation(req);
    await clearAdminSession(req, res);
    return { ok: true };
  }
  @Get('admin/me') me(@Req() req: Request) {
    return whoAmI(req);
  }
  @Get('admin/dashboard') async dashboard(@Req() req: Request) {
    await admin(req);
    return dashboard();
  }
  @Patch('admin/settings') async settings(@Body() body: unknown, @Req() req: Request) {
    await protectMutation(req);
    await admin(req);
    return updateSettings(body);
  }
  @Get('admin/content') async content(@Req() req: Request) {
    await admin(req);
    return contentRows();
  }
  @Post('admin/content/drafts') async draft(@Body() body: unknown, @Req() req: Request) {
    await protectMutation(req);
    await admin(req);
    return createDraft(body);
  }
  @Post('admin/content/:id/publish') async publish(@Param('id') id: string, @Req() req: Request) {
    await protectMutation(req);
    await admin(req);
    return publishDraft(id);
  }
  @Post('admin/sources/preview') async preview(@Body() body: unknown, @Req() req: Request) {
    await protectMutation(req);
    await admin(req);
    return previewSources(body);
  }
  @Post('admin/sources/import') async import(@Body() body: unknown, @Req() req: Request) {
    await protectMutation(req);
    await admin(req);
    return importSources(body);
  }
  @Get('admin/ai/balance') async balance(@Req() req: Request) {
    await admin(req);
    return providerBalance();
  }
  @Post('admin/ai/settle-uncertain') async settle(@Req() req: Request) {
    await protectMutation(req);
    await admin(req);
    return settleUncertain();
  }
}

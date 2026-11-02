import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { staticPhpTemplate, studyInputHash, studyRuntimeAdapter } from '@zdaj/checker';

describe('fixed educational runtime preparation', () => {
  it('binds each runtime to its reviewed task, guide revision and exact activity', () => {
    expect(studyRuntimeAdapter('inf03-01-25-01-sg', 3, 'calculator/calculator-check')?.id).toBe(
      'kursy-calculator',
    );
    expect(studyRuntimeAdapter('inf03-08-25-06-sg', 3, 'tabs/tabs-check')?.id).toBe('smoki-tabs');
    expect(
      studyRuntimeAdapter('inf03-01-25-01-sg', 2, 'calculator/calculator-check'),
    ).toBeUndefined();
    expect(
      studyRuntimeAdapter('inf03-08-25-06-sg', 3, 'calculator/calculator-check'),
    ).toBeUndefined();
    expect(studyRuntimeAdapter('cke-wedkowanie', 3, 'php/query')).toBeUndefined();
    for (const [taskId, adapter] of [
      ['inf03-01-24-01-sg', 'firma-contact'],
      ['inf03-05-24-01-sg', 'salon-calculator'],
      ['inf03-02-24-06-sg', 'chat-messages'],
    ]) {
      expect(studyRuntimeAdapter(taskId!, 1, 'runtime/runtime-check')?.id).toBe(adapter);
      expect(studyRuntimeAdapter(taskId!, 3, 'runtime/runtime-check')).toBeUndefined();
      expect(studyRuntimeAdapter(taskId!, 1, 'runtime/learner-script')).toBeUndefined();
    }
  });

  it('hashes the original files independently of upload order and default encoding', () => {
    const files = [
      { path: 'z.js', content: 'console.log("ą")' },
      { path: 'A.html', content: '<p>Żółć</p>' },
    ];
    const expected = createHash('sha256')
      .update(
        JSON.stringify([
          { path: 'A.html', content: '<p>Żółć</p>', encoding: 'utf8' },
          { path: 'z.js', content: 'console.log("ą")', encoding: 'utf8' },
        ]),
      )
      .digest('hex');
    expect(studyInputHash(files)).toBe(expected);
    expect(studyInputHash(files.toReversed().map((file) => ({ ...file, encoding: 'utf8' })))).toBe(
      expected,
    );
    expect(studyInputHash([{ ...files[0]!, content: 'different' }, files[1]!])).not.toBe(expected);
  });

  it('strips PHP syntax without confusing close-tag text inside strings or comments', () => {
    const source =
      '<section id="baza"><?php $text = "?>"; /* ?> */ echo "<script>bad()</script>"; ?></section>' +
      '<script src="widoki.js"></script><?php echo "hidden"; ?>';
    expect(staticPhpTemplate(source)).toBe(
      '<section id="baza"></section><script src="widoki.js"></script>',
    );
    expect(staticPhpTemplate('<?php while(true){} ?>')).toBe('');
    expect(staticPhpTemplate('<p>Bez PHP</p>')).toBe('<p>Bez PHP</p>');
  });
});

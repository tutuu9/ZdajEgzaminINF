import { describe, expect, it } from 'vitest';
import { PUBLIC_PAGES, robotsTxt, sitemapXml } from '../apps/api/src/site-index';

describe('robots.txt and sitemap.xml', () => {
  it('keeps learner work, administration and the API out of search indexes', () => {
    const robots = robotsTxt('https://zdajegzamin.sbs/some/path');
    expect(robots).toContain('Disallow: /api/');
    expect(robots).toContain('Disallow: /admin');
    expect(robots).toContain('Disallow: /moje-prace');
    expect(robots).toContain('Sitemap: https://zdajegzamin.sbs/sitemap.xml');
  });

  it('lists public pages and each paper once, with escaped addresses', () => {
    const xml = sitemapXml('https://zdajegzamin.sbs', ['b&<task', 'a-task', 'a-task']);
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
    for (const page of PUBLIC_PAGES)
      expect(xml).toContain(`<loc>https://zdajegzamin.sbs${page}</loc>`);
    expect(xml.match(/\/praktyka\/a-task</g)).toHaveLength(1);
    expect(xml).toContain('/praktyka/b%26%3Ctask</loc>');
    expect(xml.indexOf('a-task')).toBeLessThan(xml.indexOf('b%26'));
    expect(xml).not.toMatch(/moje-prace|admin|\/api\//);
  });
});

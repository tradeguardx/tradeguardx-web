import { describe, expect, it } from 'vitest';
import { LESSONS, SECTIONS, VIDEO_LESSONS, connectTutorialFor, formatLength, isoDuration, lessonFor } from './tutorials';

describe('tutorials', () => {
  it('has unique lesson keys and video ids, each in a known section', () => {
    expect(new Set(LESSONS.map((l) => l.key)).size).toBe(LESSONS.length);
    expect(new Set(VIDEO_LESSONS.map((l) => l.video.id)).size).toBe(VIDEO_LESSONS.length);
    const secs = new Set(SECTIONS.map((s) => s.key));
    for (const l of LESSONS) expect(secs.has(l.section)).toBe(true);
  });

  it('gives every video what Google needs, and every lesson without one some steps', () => {
    for (const l of VIDEO_LESSONS) {
      expect(l.video.seconds).toBeGreaterThan(0);
      expect(l.video.uploaded).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
    for (const l of LESSONS.filter((x) => !x.video)) expect(l.steps?.length).toBeGreaterThan(2);
  });

  it('starts with setting up the kill switch, then the exchanges', () => {
    expect(LESSONS[0].key).toBe('set-up-rules');
    expect(LESSONS.findIndex((l) => l.section === 'connect')).toBeGreaterThan(0);
    expect(LESSONS.slice(0, LESSONS.findIndex((l) => l.section === 'connect')).every((l) => l.section === 'start')).toBe(true);
  });

  it('opens a lesson from a hash or a broker id', () => {
    expect(lessonFor('exness').key).toBe('exness');
    expect(lessonFor('delta-india').key).toBe('delta');
    expect(lessonFor('shark-exchange').key).toBe('shark');
    expect(lessonFor('nonsense')).toBeNull();
    expect(lessonFor('')).toBeNull();
  });

  it('finds the main connect video for setup step one', () => {
    expect(connectTutorialFor('exness').id).toBe('mCfyRweWofY');
    expect(connectTutorialFor('delta-india').id).toBe('OGmoEeUr3Hc'); // dashboard-only stop-gap Short
    expect(connectTutorialFor('shark-exchange').id).toBe('VtfAydIu_FQ');
    expect(connectTutorialFor('bybit').id).toBe('FdQR_jIIA7I');
    expect(connectTutorialFor('coindcx')).toBeNull();
  });

  it('formats lengths', () => {
    expect(formatLength(205)).toBe('3:25');
    expect(isoDuration(205)).toBe('PT3M25S');
    expect(isoDuration(41)).toBe('PT41S');
  });
});

describe('dashboard-only stop-gap videos', () => {
  it('Delta has a dashboard video but stays out of the course, sitemap and schema', async () => {
    const t = await import('./tutorials');
    expect(t.connectTutorialFor('delta_india')?.id).toBe('OGmoEeUr3Hc');
    expect(t.VIDEO_LESSONS.some((l) => l.key === 'delta')).toBe(false);
    expect(t.lessonFor('delta').video).toBeUndefined();
    expect(t.videoObjectFor('delta')).toBeNull();
  });
});

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { SOFTPHONE_DECLINED, softphoneEndLabelKey } from './pbxCallOutcome';

// constants.ts imports React components, so read its strings as text.
const constants = readFileSync(new URL('../constants.ts', import.meta.url), 'utf8');
const arStart = constants.indexOf('\n  ar: {');
const locale = { en: constants.slice(0, arStart), ar: constants.slice(arStart) };
const text = (lang: 'en' | 'ar', key: string) => locale[lang].match(new RegExp(`\\n\\s+${key}: "([^"]*)"`))?.[1];

describe('softphone end wording', () => {
  it('says Declined after the agent declines, never Missed', () => {
    expect(softphoneEndLabelKey(SOFTPHONE_DECLINED)).toBe('softphoneEndDeclined');
    expect(text('en', 'softphoneEndDeclined')).toBe('Declined');
    expect(text('ar', 'softphoneEndDeclined')).toBe('مرفوضة');
  });

  it('keeps Missed for a caller who hung up before an answer', () => {
    expect(softphoneEndLabelKey('missed')).toBe('pbxStatus_missed');
  });

  it('uses the PBX status for every other end, and nothing when there is none', () => {
    expect(softphoneEndLabelKey('answered')).toBe('pbxStatus_answered');
    expect(softphoneEndLabelKey(null)).toBeNull();
  });
});

describe('call history wording', () => {
  it('shows a busy result as busy or declined, since a decline is recorded as busy', () => {
    expect(text('en', 'pbxStatus_busy')).toBe('Busy or declined');
    expect(text('ar', 'pbxStatus_busy')).toBe('مشغول أو مرفوضة');
  });

  it('keeps Missed distinct from busy in both languages', () => {
    expect(text('en', 'pbxStatus_missed')).toBe('Missed');
    expect(text('ar', 'pbxStatus_missed')).toBe('فائتة');
  });
});

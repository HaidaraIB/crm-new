import { describe, expect, it } from 'vitest';
import { shouldQueryTelephonyMe } from './telephonyEligibility';

describe('shouldQueryTelephonyMe', () => {
  it('does not query before authentication or while policy is loading', () => {
    expect(shouldQueryTelephonyMe(undefined, 'success', true)).toBe(false);
    expect(shouldQueryTelephonyMe(7, 'pending', undefined)).toBe(false);
  });

  it('does not query when the plan or pilot policy explicitly denies telephony', () => {
    expect(shouldQueryTelephonyMe(7, 'success', false)).toBe(false);
    expect(shouldQueryTelephonyMe(7, 'success', undefined)).toBe(false);
  });

  it('queries for an approved pilot', () => {
    expect(shouldQueryTelephonyMe(7, 'success', true)).toBe(true);
  });

  it('falls back to the telephony endpoint when policy lookup fails', () => {
    expect(shouldQueryTelephonyMe(7, 'error', undefined)).toBe(true);
  });
});

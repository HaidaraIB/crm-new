import { describe, expect, it } from 'vitest';
import { catalogFieldErrors } from './catalogFieldErrors';
import { matchCountryByPhone, phoneForForm } from '../utils/countries';

describe('phoneForForm', () => {
  it.each([
    ['9647715952998', '+9647715952998'],
    ['+9647715952998', '+9647715952998'],
    ['07715952998', '+9647715952998'],
    [' 964 771-595-2998 ', '+9647715952998'],
  ])('turns stored %s into a valid, country-matched +E.164', (stored, expected) => {
    const phone = phoneForForm(stored);
    expect(phone).toBe(expected);
    expect(catalogFieldErrors('supplier.upsert', { name: 'Acme', phone }, (key) => key).phone).toBeUndefined();
    expect(matchCountryByPhone(phone)).toMatchObject({ country: { code: 'IQ' }, national: '7715952998' });
  });

  it('keeps empty values empty', () => {
    expect(phoneForForm('')).toBe('');
    expect(phoneForForm(null)).toBe('');
    expect(phoneForForm(undefined)).toBe('');
  });
});

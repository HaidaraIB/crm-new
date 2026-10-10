import { describe, expect, it } from 'vitest';
import snapshot from './catalog/catalog.snapshot.json';
import vectorsFile from './catalog/vectors.json';
import { evaluateForm } from './engine';
import type { CatalogDocument } from './types';

const catalog = snapshot as CatalogDocument;
const vectors = (vectorsFile as { vectors: { form: string; data: Record<string, unknown>; context?: Record<string, unknown>; partial?: boolean; expect: Record<string, string[]> }[] }).vectors;

// Exercises `evaluateForm` directly — the function `catalogFieldErrors`/`serverFieldErrors`
// (forms/catalogFieldErrors.ts) actually call. That's the path every real form in this app
// uses; there is no `compileSchema`/`useAppForm` consumer left to test instead.
describe('catalog conformance', () => {
  it('matches backend vectors', () => {
    const failures: string[] = [];
    for (const vector of vectors) {
      const form = catalog.forms[vector.form];
      const issues = evaluateForm(form, vector.data, {
        context: vector.context || {},
        partial: vector.partial === true,
        enforceClientOnly: true,
      });
      const actual: Record<string, string[]> = {};
      for (const [path, items] of Object.entries(issues)) {
        actual[path] = items.map((item) => item.code);
      }
      const expectCodes = vector.expect;
      const same = JSON.stringify(actual) === JSON.stringify(expectCodes);
      if (!same) failures.push(`${vector.form} data=${JSON.stringify(vector.data)} expected=${JSON.stringify(expectCodes)} actual=${JSON.stringify(actual)}`);
    }
    expect(failures).toEqual([]);
  });
});

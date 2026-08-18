/**
 * Deterministic per-string bidi direction, for rows whose layout (item order +
 * text alignment) must follow the content's own script rather than the page's
 * ambient `dir` -- e.g. a lead-name row where an action button must always sit
 * on the opposite side of the name.
 *
 * Browser `dir="auto"` on a flex *item* only flips that item's own text
 * alignment -- it does NOT reorder flex items, since item order is controlled
 * by the flex *container's* direction. Applying `dir="auto"` to an item nested
 * inside an ambient-direction row can therefore glue the name and an action
 * button on the same side. Compute direction once from the row's primary
 * content and apply it to the row container itself instead.
 */

// Hebrew (U+0590-05FF), Arabic + Supplement + Extended-A (U+0600-06FF, U+0750-077F, U+08A0-08FF),
// Arabic Presentation Forms A/B (U+FB50-FDFF, U+FE70-FEFF).
const RTL_CHAR_RANGE = new RegExp(
  '[\\u0590-\\u05FF\\u0600-\\u06FF\\u0750-\\u077F\\u08A0-\\u08FF\\uFB50-\\uFDFF\\uFE70-\\uFEFF]'
);

export type TextDirection = 'rtl' | 'ltr';

export function getTextDirection(text?: string | null): TextDirection {
  if (!text) return 'ltr';
  return RTL_CHAR_RANGE.test(text) ? 'rtl' : 'ltr';
}

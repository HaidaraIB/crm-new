/** Structured input types stay LTR; free text follows first strong letter, empty → UI direction. */

const LTR_INPUT_TYPES = new Set([
  'email',
  'tel',
  'url',
  'number',
  'date',
  'datetime-local',
  'time',
  'month',
  'week',
  'color',
]);

const RTL_STRONG = /[\u0590-\u05FF\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB1D-\uFDFF\uFE70-\uFEFF]/;
const LTR_STRONG = /[A-Za-z\u00C0-\u024F]/;

/** First strong letter, else UI direction (empty placeholders align with locale). */
export function inputTextDir(text: string, uiIsRtl: boolean): 'ltr' | 'rtl' {
  for (const ch of text) {
    if (RTL_STRONG.test(ch)) return 'rtl';
    if (LTR_STRONG.test(ch)) return 'ltr';
  }
  return uiIsRtl ? 'rtl' : 'ltr';
}

/** Numeric values stay LTR; empty field follows UI so Arabic placeholders align. */
export function resolveNumberFieldDir(text: string, uiIsRtl: boolean): 'ltr' | 'rtl' {
  if (String(text ?? '').trim() === '') return uiIsRtl ? 'rtl' : 'ltr';
  return 'ltr';
}

export function resolveInputDir(
  type: string | undefined,
  text: string,
  uiIsRtl: boolean,
): 'ltr' | 'rtl' {
  const t = (type ?? 'text').toLowerCase();
  if (t === 'number') return resolveNumberFieldDir(text, uiIsRtl);
  if (LTR_INPUT_TYPES.has(t)) return 'ltr';
  return inputTextDir(text, uiIsRtl);
}

function documentUiIsRtl(): boolean {
  if (typeof document === 'undefined') return false;
  return document.documentElement.dir === 'rtl';
}

function applyDirToField(el: HTMLInputElement | HTMLTextAreaElement): void {
  if (el.hasAttribute('dir')) return;
  const uiRtl = documentUiIsRtl();
  if (el instanceof HTMLTextAreaElement) {
    el.setAttribute('dir', inputTextDir(el.value, uiRtl));
    return;
  }
  const type = (el.getAttribute('type') ?? 'text').toLowerCase();
  if (type === 'hidden' || type === 'checkbox' || type === 'radio' || type === 'file') return;
  el.setAttribute('dir', resolveInputDir(type, el.value, uiRtl));
}

/** Re-apply direction when UI locale changes (installInputAutoDir only runs once per node). */
export function syncInputDirections(): void {
  if (typeof document === 'undefined') return;
  const uiRtl = documentUiIsRtl();
  document.querySelectorAll('input, textarea').forEach((node) => {
    if (!(node instanceof HTMLInputElement || node instanceof HTMLTextAreaElement)) return;
    const type = node instanceof HTMLTextAreaElement ? 'text' : (node.getAttribute('type') ?? 'text').toLowerCase();
    if (type === 'hidden' || type === 'checkbox' || type === 'radio' || type === 'file') return;
    const next =
      node instanceof HTMLTextAreaElement
        ? inputTextDir(node.value, uiRtl)
        : resolveInputDir(type, node.value, uiRtl);
    node.setAttribute('dir', next);
  });
}

function scan(root: ParentNode): void {
  root.querySelectorAll('input, textarea').forEach((node) => {
    if (node instanceof HTMLInputElement || node instanceof HTMLTextAreaElement) {
      applyDirToField(node);
    }
  });
}

/** Call once before React mount; React-owned `dir` is left alone. */
export function installInputAutoDir(): void {
  if (typeof document === 'undefined') return;
  scan(document.body);
  const observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      for (const node of m.addedNodes) {
        if (node instanceof HTMLInputElement || node instanceof HTMLTextAreaElement) {
          applyDirToField(node);
        } else if (node instanceof HTMLElement) {
          scan(node);
        }
      }
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

/** @deprecated Use resolveInputDir */
export function dirForInputType(type?: string, text = '', uiIsRtl = false): 'ltr' | 'rtl' {
  return resolveInputDir(type, text, uiIsRtl);
}

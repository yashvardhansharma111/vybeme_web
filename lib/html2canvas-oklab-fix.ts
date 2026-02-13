/**
 * html2canvas does not support CSS oklab()/oklch() (e.g. from Tailwind v4).
 * 1) Patch stylesheets in the cloned document so no rule uses oklab/oklch.
 * 2) Walk the cloned element tree and set inline rgb fallback where computed style has oklab.
 *
 * Use as onclone in html2canvas options:
 *   html2canvas(el, { onclone: (doc, clone) => sanitizeOklabForHtml2Canvas(doc, clone) })
 */
function hasUnsupportedColor(value: string): boolean {
  if (!value || typeof value !== 'string') return false;
  const v = value.toLowerCase();
  return v.includes('oklab(') || v.includes('oklch(');
}

const FALLBACK = 'rgb(128, 128, 128)';

/** Patch all stylesheets in the cloned document so no rule uses oklab/oklch. */
function patchStylesheets(doc: Document): void {
  try {
    const sheets = doc.styleSheets;
    for (let s = 0; s < sheets.length; s++) {
      const sheet = sheets[s];
      try {
        const rules = sheet.cssRules || sheet.rules;
        if (!rules) continue;
        for (let r = 0; r < rules.length; r++) {
          const rule = rules[r] as CSSStyleRule;
          if (rule.style) {
            for (let i = 0; i < rule.style.length; i++) {
              const prop = rule.style[i];
              const val = rule.style.getPropertyValue(prop);
              if (val && hasUnsupportedColor(val)) {
                rule.style.setProperty(prop, FALLBACK);
              }
            }
          }
        }
      } catch {
        // CORS or disabled stylesheet
      }
    }
  } catch {
    // ignore
  }
}

const COLOR_PROPS = [
  'color',
  'background-color',
  'border-color',
  'border-top-color',
  'border-right-color',
  'border-bottom-color',
  'border-left-color',
  'outline-color',
  'fill',
  'stroke',
];

function walkAndSanitizeComputed(clone: HTMLElement, win: Window): void {
  if (clone.nodeType !== Node.ELEMENT_NODE) return;
  try {
    const computed = win.getComputedStyle(clone);
    for (const prop of COLOR_PROPS) {
      const value = computed.getPropertyValue(prop);
      if (value && hasUnsupportedColor(value)) {
        clone.style.setProperty(prop, FALLBACK);
      }
    }
  } catch {
    // ignore
  }
  const children = clone.childNodes;
  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    if (child && child.nodeType === Node.ELEMENT_NODE) {
      walkAndSanitizeComputed(child as HTMLElement, win);
    }
  }
}

export function sanitizeOklabForHtml2Canvas(clonedDocument: Document, clonedElement: HTMLElement): void {
  patchStylesheets(clonedDocument);
  const win = clonedDocument.defaultView || (typeof window !== 'undefined' ? window : null);
  if (win) walkAndSanitizeComputed(clonedElement, win);
}

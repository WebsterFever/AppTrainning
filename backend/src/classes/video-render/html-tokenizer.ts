export type TokenColor = 'bracket' | 'tagname' | 'attrname' | 'attrvalue' | 'comment' | 'punct' | 'text';

export interface ColoredSpan {
  text: string;
  color: TokenColor;
}

const NAME_CHAR = /[a-zA-Z0-9-]/;
const WHITESPACE = /\s/;

// Tokenizes an HTML prefix into colored spans for the canvas renderer.
// Deliberately hand-rolled and minimal rather than pulling in a full
// syntax-highlighting library — those emit HTML/DOM output for browser
// rendering, not canvas-ready color runs, so a small custom scanner is
// actually simpler here. Covers tags, attribute names/values, and
// comments; anything else falls back to plain text coloring rather than
// erroring.
//
// Must tolerate an incomplete/truncated tag at the very end of the input —
// this runs once per rendered frame against whatever prefix of the code
// has been "typed" so far, so `<met` (mid keystroke) is a normal input,
// not an edge case to special-case away.
//
// Invariant relied on elsewhere: concatenating every span's `text` must
// reproduce the input exactly (no characters dropped, added, or
// reordered) — this is what guarantees the typing animation never
// silently corrupts the admin's code.
export function tokenizeHtml(text: string): ColoredSpan[] {
  const spans: ColoredSpan[] = [];
  const n = text.length;
  let i = 0;

  const push = (str: string, color: TokenColor) => {
    if (str) spans.push({ text: str, color });
  };

  while (i < n) {
    if (text.startsWith('<!--', i)) {
      const end = text.indexOf('-->', i + 4);
      const stop = end === -1 ? n : end + 3;
      push(text.slice(i, stop), 'comment');
      i = stop;
      continue;
    }

    if (text[i] === '<') {
      let j = i + 1;
      if (text[j] === '/') j++;
      push(text.slice(i, j), 'bracket'); // '<' or '</'
      i = j;

      const nameStart = i;
      while (i < n && NAME_CHAR.test(text[i])) i++;
      push(text.slice(nameStart, i), 'tagname');

      while (i < n && text[i] !== '>') {
        const c = text[i];
        if (c === '/' && (i + 1 >= n || text[i + 1] === '>')) {
          push('/', 'bracket');
          i++;
          continue;
        }
        if (WHITESPACE.test(c)) {
          const s = i;
          while (i < n && WHITESPACE.test(text[i])) i++;
          push(text.slice(s, i), 'text');
          continue;
        }
        if (c === '=') {
          push('=', 'punct');
          i++;
          continue;
        }
        if (c === '"' || c === "'") {
          const quote = c;
          const s = i;
          i++;
          while (i < n && text[i] !== quote) i++;
          if (i < n) i++; // include closing quote
          push(text.slice(s, i), 'attrvalue');
          continue;
        }
        const s = i;
        while (i < n && NAME_CHAR.test(text[i])) i++;
        if (i === s) {
          push(text[i], 'text');
          i++;
          continue;
        }
        push(text.slice(s, i), 'attrname');
      }
      if (i < n && text[i] === '>') {
        push('>', 'bracket');
        i++;
      }
      continue;
    }

    const s = i;
    while (i < n && text[i] !== '<') i++;
    push(text.slice(s, i), 'text');
  }

  return spans;
}

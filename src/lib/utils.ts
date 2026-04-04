// Matches optional variant prefixes (e.g. "sm:", "hover:"), optional "!",
// then the utility name prefix (e.g. "w", "bg", "text") followed by "-".
const PREFIX_RE = /^((?:[a-z-]+:)*)(!?)([a-z]+(?:-\[[^\]]+\])?)-/;

/**
 * Merges Tailwind class names. Later classes win when two classes share the
 * same utility prefix (e.g. cn('w-full', 'w-14') → 'w-14').
 * Falsy values are ignored.
 */
export function cn(...classes: (string | undefined | null | false)[]): string {
  const seen = new Map<string, string>();
  for (const cls of classes) {
    if (!cls) continue;
    for (const part of cls.trim().split(/\s+/)) {
      if (!part) continue;
      const m = part.match(PREFIX_RE);
      // key = variant-prefix + utility-prefix (e.g. "sm:w", "hover:bg")
      const key = m ? `${m[1]}${m[3]}` : part;
      seen.set(key, part);
    }
  }
  return [...seen.values()].join(' ');
}

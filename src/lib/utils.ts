import { twMerge } from 'tailwind-merge';

/**
 * Merges Tailwind class names. Conflicting utility classes are resolved
 * by tailwind-merge (last value wins per CSS property). Falsy values ignored.
 *
 * Examples:
 *   cn('w-full', 'w-14')                → 'w-14'
 *   cn('text-sm', 'text-foreground')    → 'text-sm text-foreground' (different properties)
 *   cn('border', 'border-border')       → 'border border-border'    (different properties)
 */
export function cn(...classes: (string | undefined | null | false)[]): string {
  return twMerge(classes.filter(Boolean).join(' '));
}

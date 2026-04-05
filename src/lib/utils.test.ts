import { describe, it, expect } from 'vitest';
import { cn } from './utils';

describe('cn', () => {
  // --- Width deduplication (the original root-cause fix) ---
  it('deduplicates conflicting width classes — last wins', () => {
    expect(cn('w-full', 'w-14')).toBe('w-14');
  });

  it('deduplicates conflicting bg classes — last wins (same CSS property)', () => {
    expect(cn('bg-background', 'bg-red-500')).toBe('bg-red-500');
  });

  // --- Regression guards: classes that must NOT be deduplicated ---
  it('keeps border AND border-color (different CSS properties)', () => {
    const result = cn('border', 'border-border');
    expect(result).toMatch(/\bborder\b/);
    expect(result).toContain('border-border');
  });

  it('keeps text-sm AND text-foreground (font-size ≠ color)', () => {
    const result = cn('text-sm', 'text-foreground');
    expect(result).toContain('text-sm');
    expect(result).toContain('text-foreground');
  });

  it('keeps flex AND flex-shrink-0 (display ≠ flex-shrink)', () => {
    const result = cn('flex', 'flex-shrink-0');
    expect(result).toContain('flex');
    expect(result).toContain('flex-shrink-0');
  });

  it('keeps focus:ring-2 AND focus:ring-color (ring-width ≠ ring-color)', () => {
    const result = cn('focus:ring-2', 'focus:ring-primary/50');
    expect(result).toContain('focus:ring-2');
    expect(result).toContain('focus:ring-primary/50');
  });

  // --- Utility behaviour ---
  it('deduplicates with responsive prefix — last wins', () => {
    const result = cn('w-full', 'sm:w-48');
    expect(result).toContain('w-full');   // base (no breakpoint)
    expect(result).toContain('sm:w-48'); // sm-breakpoint variant
  });

  it('filters falsy values', () => {
    expect(cn('a', false, undefined, null, 'b')).toBe('a b');
  });

  it('returns empty string when called with no args', () => {
    expect(cn()).toBe('');
  });
});

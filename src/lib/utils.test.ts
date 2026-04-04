import { describe, it, expect } from 'vitest';
import { cn } from './utils';

describe('cn', () => {
  it('deduplicates conflicting width classes — last wins', () => {
    expect(cn('w-full', 'w-14')).toBe('w-14');
  });

  it('deduplicates conflicting bg classes — last wins', () => {
    expect(cn('bg-background', 'bg-red-500')).toBe('bg-red-500');
  });

  it('keeps independent utility prefixes', () => {
    const result = cn('w-14', 'h-10', 'bg-background');
    expect(result).toContain('w-14');
    expect(result).toContain('h-10');
    expect(result).toContain('bg-background');
  });

  it('deduplicates with responsive prefix — last wins', () => {
    const result = cn('w-full', 'sm:w-48');
    // sm:w-48 has a different key (sm:w) so both survive
    expect(result).toContain('w-full');
    expect(result).toContain('sm:w-48');
  });

  it('filters falsy values', () => {
    expect(cn('a', false, undefined, null, 'b')).toBe('a b');
  });

  it('returns empty string when called with no args', () => {
    expect(cn()).toBe('');
  });

  it('returns empty string for all-falsy args', () => {
    expect(cn(false, undefined, null)).toBe('');
  });
});

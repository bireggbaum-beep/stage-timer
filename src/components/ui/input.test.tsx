import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Input } from './input';

describe('Input', () => {
  it('has no default width class', () => {
    render(<Input data-testid="inp" />);
    expect(screen.getByTestId('inp').className).not.toMatch(/\bw-full\b/);
  });

  it('applies a caller-supplied fixed width', () => {
    render(<Input data-testid="inp" className="w-14" />);
    const cls = screen.getByTestId('inp').className;
    expect(cls).toMatch(/\bw-14\b/);
    expect(cls).not.toMatch(/\bw-full\b/);
  });

  it('applies w-full when the caller passes it explicitly', () => {
    render(<Input data-testid="inp" className="w-full" />);
    expect(screen.getByTestId('inp').className).toMatch(/\bw-full\b/);
  });

  it('does not duplicate classes when no className is passed', () => {
    render(<Input data-testid="inp" />);
    const parts = screen.getByTestId('inp').className.split(/\s+/);
    const unique = new Set(parts);
    expect(parts.length).toBe(unique.size);
  });
});

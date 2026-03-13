import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline' | 'ghost' | 'destructive';
  size?: 'sm' | 'md' | 'lg' | 'icon';
}

export function Button({
  variant = 'default',
  size = 'md',
  className = '',
  children,
  disabled,
  ...props
}: ButtonProps) {
  const base =
    'inline-flex items-center justify-center rounded-md font-medium transition-colors ' +
    'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ' +
    'disabled:opacity-50 disabled:pointer-events-none cursor-pointer select-none';

  const variants: Record<string, string> = {
    default: 'bg-primary text-primary-foreground hover:opacity-90',
    outline: 'border border-border bg-transparent text-foreground hover:bg-muted',
    ghost: 'bg-transparent text-foreground hover:bg-muted',
    destructive: 'bg-destructive text-destructive-foreground hover:opacity-90',
  };

  const sizes: Record<string, string> = {
    sm: 'h-8 px-3 text-xs gap-1',
    md: 'h-10 px-4 text-sm gap-2',
    lg: 'h-11 px-6 text-base gap-2',
    icon: 'h-10 w-10',
  };

  return (
    <button
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}

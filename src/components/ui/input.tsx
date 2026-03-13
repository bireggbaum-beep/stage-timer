import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={
          'flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 ' +
          'text-sm text-foreground placeholder:text-muted-foreground ' +
          'focus:outline-none focus:ring-2 focus:ring-primary/50 ' +
          'disabled:cursor-not-allowed disabled:opacity-50 ' +
          className
        }
        {...props}
      />
    );
  }
);
Input.displayName = 'Input';

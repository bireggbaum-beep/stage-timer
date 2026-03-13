import React from 'react';

export const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className = '', ...props }, ref) => (
  <div
    ref={ref}
    className={`rounded-lg border border-border bg-card text-card-foreground ${className}`}
    {...props}
  />
));
Card.displayName = 'Card';

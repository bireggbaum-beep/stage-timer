import React, {
  createContext,
  useContext,
  useState,
  useLayoutEffect,
  ReactNode,
} from 'react';

interface SelectItem {
  value: string;
  label: string;
}

interface SelectContextValue {
  value: string;
  onValueChange: (v: string) => void;
  items: SelectItem[];
  addItem: (item: SelectItem) => void;
}

const SelectContext = createContext<SelectContextValue | null>(null);

// ── Select (root) ─────────────────────────────────────────────
export function Select({
  value,
  onValueChange,
  children,
}: {
  value: string;
  onValueChange: (v: string) => void;
  children: ReactNode;
}) {
  const [items, setItems] = useState<SelectItem[]>([]);

  const addItem = (item: SelectItem) => {
    setItems((prev) => {
      if (prev.some((i) => i.value === item.value)) return prev;
      return [...prev, item];
    });
  };

  return (
    <SelectContext.Provider value={{ value, onValueChange, items, addItem }}>
      <div className="relative w-full">{children}</div>
    </SelectContext.Provider>
  );
}

// ── SelectTrigger — renders the native <select> ───────────────
export function SelectTrigger({
  className = '',
  id,
  children: _children,
}: {
  className?: string;
  id?: string;
  children?: ReactNode;
}) {
  const ctx = useContext(SelectContext)!;

  return (
    <select
      id={id}
      value={ctx.value}
      onChange={(e) => ctx.onValueChange(e.target.value)}
      className={
        'h-10 w-full rounded-md border border-border bg-background px-3 py-2 ' +
        'text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 ' +
        'cursor-pointer ' +
        className
      }
    >
      {ctx.items.map((item) => (
        <option key={item.value} value={item.value}>
          {item.label}
        </option>
      ))}
    </select>
  );
}

// ── SelectContent — invisible wrapper, just renders children ──
export function SelectContent({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

// ── SelectItem — registers itself, renders nothing ────────────
export function SelectItem({
  value,
  children,
}: {
  value: string;
  children: ReactNode;
}) {
  const ctx = useContext(SelectContext)!;
  const label = typeof children === 'string' ? children : String(children);

  useLayoutEffect(() => {
    ctx.addItem({ value, label });
  }, [value, label]); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}

// ── SelectValue — handled by SelectTrigger, no-op here ───────
export function SelectValue(_props: { placeholder?: string }) {
  return null;
}

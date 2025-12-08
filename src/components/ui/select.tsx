"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface SelectContextType {
  value: string;
  onValueChange: (value: string) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
}

const SelectContext = React.createContext<SelectContextType | undefined>(undefined);

interface SelectProps {
  value: string;
  onValueChange: (value: string) => void;
  children: React.ReactNode;
}

const Select = ({ value, onValueChange, children }: SelectProps) => {
  const [open, setOpen] = React.useState(false);

  return (
    <SelectContext.Provider value={{ value, onValueChange, open, setOpen }}>
      <div className="relative">{children}</div>
    </SelectContext.Provider>
  );
};

const SelectTrigger = React.forwardRef<HTMLButtonElement, React.HTMLAttributes<HTMLButtonElement>>(
  ({ className = "", children, ...props }, ref) => {
    const context = React.useContext(SelectContext);
    if (!context) throw new Error("SelectTrigger must be used within Select");

    return (
      <button
        ref={ref}
        type="button"
        className={cn(
          "flex h-10 w-full items-center justify-between rounded-md border border-slate-600 bg-slate-700 px-3 py-2 text-sm text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        onClick={() => context.setOpen(!context.open)}
        {...props}
      >
        {children}
        <span className="ml-2">▼</span>
      </button>
    );
  }
);
SelectTrigger.displayName = "SelectTrigger";

const SelectValue = ({ placeholder = "" }: { placeholder?: string }) => {
  const context = React.useContext(SelectContext);
  if (!context) throw new Error("SelectValue must be used within Select");

  const selectedChild = React.Children.toArray(
    React.useContext(SelectContentContext)?.children || []
  ).find((child) => {
    if (React.isValidElement(child)) {
      const props = child.props as any;
      return props?.value === context.value;
    }
    return false;
  });

  if (React.isValidElement(selectedChild)) {
    const props = selectedChild.props as any;
    return <span>{props?.children || placeholder}</span>;
  }

  return <span>{placeholder}</span>;
};

const SelectContentContext = React.createContext<{ children: React.ReactNode } | undefined>(undefined);

const SelectContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className = "", children, ...props }, ref) => {
    const context = React.useContext(SelectContext);
    if (!context) throw new Error("SelectContent must be used within Select");

    return (
      <SelectContentContext.Provider value={{ children }}>
        {context.open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => context.setOpen(false)} />
            <div
              ref={ref}
              className={cn(
                "absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border border-slate-600 bg-slate-700 py-1 shadow-lg",
                className
              )}
              {...props}
            >
              {children}
            </div>
          </>
        )}
      </SelectContentContext.Provider>
    );
  }
);
SelectContent.displayName = "SelectContent";

interface SelectItemProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
}

const SelectItem = React.forwardRef<HTMLDivElement, SelectItemProps>(
  ({ className = "", value, children, ...props }, ref) => {
    const context = React.useContext(SelectContext);
    if (!context) throw new Error("SelectItem must be used within Select");

    return (
      <div
        ref={ref}
        className={cn(
          "relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-slate-600",
          context.value === value ? "bg-slate-600" : "",
          className
        )}
        onClick={() => {
          context.onValueChange(value);
          context.setOpen(false);
        }}
        {...props}
      >
        {children}
      </div>
    );
  }
);
SelectItem.displayName = "SelectItem";

export { Select, SelectTrigger, SelectValue, SelectContent, SelectItem };

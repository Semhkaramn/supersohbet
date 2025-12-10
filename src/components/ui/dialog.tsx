"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface DialogContextType {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const DialogContext = React.createContext<DialogContextType | undefined>(undefined);

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

const Dialog = ({ open, onOpenChange, children }: DialogProps) => {
  return (
    <DialogContext.Provider value={{ open, setOpen: onOpenChange }}>
      {children}
    </DialogContext.Provider>
  );
};

const DialogTrigger = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement>>(
  ({ children, ...props }, ref) => {
    const context = React.useContext(DialogContext);
    if (!context) throw new Error("DialogTrigger must be used within Dialog");

    return (
      <button ref={ref} onClick={() => context.setOpen(true)} {...props}>
        {children}
      </button>
    );
  }
);
DialogTrigger.displayName = "DialogTrigger";

const DialogContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className = "", children, ...props }, ref) => {
    const context = React.useContext(DialogContext);
    if (!context) throw new Error("DialogContent must be used within Dialog");

    if (!context.open) return null;

    return (
      <>
        <div
          className="fixed inset-0 z-50 bg-black/80"
          onClick={() => context.setOpen(false)}
        />
        <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 p-4">
          <div
            ref={ref}
            className={cn("relative rounded-lg border bg-slate-800 border-slate-700 p-6 shadow-lg", className)}
            {...props}
          >
            <button
              className="absolute right-4 top-4 rounded-sm opacity-70 hover:opacity-100 text-white"
              onClick={() => context.setOpen(false)}
            >
              ✕
            </button>
            {children}
          </div>
        </div>
      </>
    );
  }
);
DialogContent.displayName = "DialogContent";

const DialogHeader = ({ className = "", ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col space-y-1.5 text-center sm:text-left", className)} {...props} />
);
DialogHeader.displayName = "DialogHeader";

const DialogTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className = "", ...props }, ref) => (
    <h2 ref={ref} className={cn("text-lg font-semibold text-white", className)} {...props} />
  )
);
DialogTitle.displayName = "DialogTitle";

const DialogDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className = "", ...props }, ref) => (
    <p ref={ref} className={cn("text-sm text-slate-400", className)} {...props} />
  )
);
DialogDescription.displayName = "DialogDescription";

const DialogFooter = ({ className = "", ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 mt-6", className)} {...props} />
);
DialogFooter.displayName = "DialogFooter";

export { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter };

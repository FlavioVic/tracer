import type { InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string;
  error?: string;
}

export function Input({ label, hint, error, id, className = "", ...props }: InputProps) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-[13px] font-semibold">
        {label}
      </label>
      <input
        id={id}
        className={`w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition-colors focus:ring-3 focus:ring-accent/12 disabled:cursor-not-allowed disabled:bg-zinc-50 disabled:text-text-secondary ${
          error
            ? "border-danger focus:border-danger focus:ring-danger/12"
            : "border-border focus:border-accent"
        } ${className}`}
        {...props}
      />
      {error ? (
        <div className="mt-1.5 text-xs text-danger">{error}</div>
      ) : (
        hint && <div className="mt-1.5 text-xs text-text-secondary">{hint}</div>
      )}
    </div>
  );
}

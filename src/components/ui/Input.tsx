"use client";

import { forwardRef, InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = "", id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-text-primary mb-1.5"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`w-full px-4 py-3 min-h-[44px] rounded-lg border border-gray-300 focus:border-teal-primary focus:ring-2 focus:ring-teal-primary/20 bg-white outline-none transition-colors ${
            error ? "border-danger" : ""
          } ${className}`}
          {...props}
        />
        {error && <p className="text-danger text-sm mt-1">{error}</p>}
      </div>
    );
  }
);

Input.displayName = "Input";

export default Input;

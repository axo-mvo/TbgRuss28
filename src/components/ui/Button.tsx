"use client";

import { ButtonHTMLAttributes } from "react";

type ButtonVariant = "primary" | "secondary" | "danger";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: "bg-teal-primary text-white hover:bg-teal-secondary",
  secondary: "bg-white text-teal-primary border border-teal-primary hover:bg-teal-primary/5",
  danger: "bg-danger text-white hover:bg-danger/90",
};

export default function Button({
  children,
  variant = "primary",
  className = "",
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`min-h-[44px] px-6 py-3 rounded-lg font-medium transition-colors disabled:opacity-50 w-full ${variantStyles[variant]} ${className}`}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}

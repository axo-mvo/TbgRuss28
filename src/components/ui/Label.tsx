import { LabelHTMLAttributes } from "react";

interface LabelProps extends LabelHTMLAttributes<HTMLLabelElement> {
  children: React.ReactNode;
}

export default function Label({
  children,
  className = "",
  ...props
}: LabelProps) {
  return (
    <label
      className={`block text-sm font-medium text-text-primary mb-1.5 ${className}`}
      {...props}
    >
      {children}
    </label>
  );
}

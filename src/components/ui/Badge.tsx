type BadgeVariant = "youth" | "parent" | "admin";

interface BadgeProps {
  children: React.ReactNode;
  variant: BadgeVariant;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  youth: "bg-teal-primary/10 text-teal-primary",
  parent: "bg-coral/10 text-coral",
  admin: "bg-warning/10 text-warning",
};

export default function Badge({
  children,
  variant,
  className = "",
}: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${variantStyles[variant]} ${className}`}
    >
      {children}
    </span>
  );
}

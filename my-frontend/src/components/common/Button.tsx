import type { ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "ghost";
}

export default function Button({
  variant = "primary",
  className = "",
  type = "button",
  ...props
}: ButtonProps) {
  const cls =
    variant === "primary"
      ? `btn-primary ${className}`.trim()
      : `btn-ghost ${className}`.trim();
  return <button type={type} className={cls} {...props} />;
}

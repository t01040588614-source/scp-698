interface BadgeProps {
  children: React.ReactNode;
  tone?: "primary" | "positive" | "negative" | "warning" | "muted";
}

export default function Badge({ children, tone = "muted" }: BadgeProps) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

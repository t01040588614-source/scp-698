import Link from "next/link";

type Crumb = { label: string; href?: string };

type MarketPageShellProps = {
  breadcrumbs: Crumb[];
  title: string;
  description: string;
  children: React.ReactNode;
  toolbar?: React.ReactNode;
  compactHead?: boolean;
  /** 종목 상세 등 — 컨테이너 좌우 여백 최소·전폭 */
  fullWidth?: boolean;
};

export default function MarketPageShell({
  breadcrumbs,
  title,
  description,
  children,
  toolbar,
  compactHead,
  fullWidth,
}: MarketPageShellProps) {
  return (
    <div
      className={`container page-section page-section--market${fullWidth ? " page-section--market-full" : ""}`}
    >
      <header
        className={`inv-page-head inv-page-head--band${compactHead ? " inv-page-head--compact" : ""}`}
      >
        <ol className="inv-breadcrumb">
          {breadcrumbs.map((c) => (
            <li key={c.label}>
              {c.href ? <Link href={c.href}>{c.label}</Link> : c.label}
            </li>
          ))}
        </ol>
        <h1 className="inv-page-title">{title}</h1>
        <p className={`inv-page-desc${compactHead ? " inv-page-desc--compact" : ""}`}>{description}</p>
      </header>
      {toolbar}
      {children}
    </div>
  );
}

import Link from "next/link";
import { AUTH_TERM_SECTIONS } from "@/content/authTerms";
import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata({
  title: "투자정보·면책 고지",
  description: "MarketLens 투자정보 면책",
  path: "/legal/finance",
});

export default function FinanceLegalPage() {
  const section = AUTH_TERM_SECTIONS.finance;
  return (
    <div className="legal-doc-page">
      <div className="legal-doc-inner">
        <Link href="/register" className="link-accent legal-doc-back">
          ← 회원가입으로
        </Link>
        <h1>{section.title}</h1>
        <pre className="legal-doc-body">{section.body}</pre>
      </div>
    </div>
  );
}

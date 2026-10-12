import Link from "next/link";
import { AUTH_TERM_SECTIONS } from "@/content/authTerms";
import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata({
  title: "개인정보 처리방침",
  description: "MarketLens 개인정보 수집·이용",
  path: "/legal/privacy",
});

export default function PrivacyPage() {
  const section = AUTH_TERM_SECTIONS.privacy;
  return (
    <div className="legal-doc-page">
      <div className="legal-doc-inner">
        <Link href="/register" className="link-accent legal-doc-back">
          ← 회원가입으로
        </Link>
        <h1>{section.title}</h1>
        <pre className="legal-doc-body">{section.body}</pre>
        <h2 id="marketing">마케팅 정보 수신</h2>
        <pre className="legal-doc-body">{AUTH_TERM_SECTIONS.marketing.body}</pre>
      </div>
    </div>
  );
}

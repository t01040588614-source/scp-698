import { redirect } from "next/navigation";

type Props = { params: { code: string } };

/** DOCX /stocks/[code] → 통합 종목 상세 (·Investing 차트) */
export default function StockDetailRedirectPage({ params }: Props) {
  redirect(`/quote/korea/${encodeURIComponent(params.code)}`);
}

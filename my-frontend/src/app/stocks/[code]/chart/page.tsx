import { redirect } from "next/navigation";

type Props = { params: { code: string } };

export default function StockChartRedirectPage({ params }: Props) {
  redirect(`/charts?market=korea&symbol=${encodeURIComponent(params.code)}`);
}

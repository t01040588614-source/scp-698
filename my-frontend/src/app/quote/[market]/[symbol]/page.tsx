import QuotePageContent from "@/components/quote/QuotePageContent";

type PageProps = {
  params: { market: string; symbol: string };
};

export default function QuotePage({ params }: PageProps) {
  const market = params.market === "us" ? "us" : "korea";
  return <QuotePageContent market={market} symbol={params.symbol} />;
}

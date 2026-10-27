export type StocksSourceLabel = "yahoo" | "fdr" | "reference" | "none";

export function mapKoreaStocksSource(source?: string | null): StocksSourceLabel {
  if (source === "fdr") return "fdr";
  if (
    source === "yahoo" ||
    source === "yahoo+kis_watch" ||
    source === "kis" ||
    source?.startsWith("yahoo")
  ) {
    return "yahoo";
  }
  if (source === "reference") return "reference";
  return "none";
}

export function mapUsStocksSource(source?: string | null): StocksSourceLabel {
  if (source === "yahoo") return "yahoo";
  if (source === "reference") return "reference";
  return "none";
}

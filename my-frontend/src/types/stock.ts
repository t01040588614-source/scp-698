export interface Stock {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  marketCap: number;
  high: number;
  low: number;
  open: number;
  previousClose: number;
  peRatio?: number;
  eps?: number;
  sector?: string;
}

export interface MarketIndexQuote {
  id: string;
  name: string;
  country: string;
  category?: string;
  price: number;
  change: number;
  changePercent: number;
  status: string;
}

export interface MarketSectorItem {
  id: string;
  label: string;
  count: number;
}

export interface KoreaStock extends Stock {
  market: 'KOSPI' | 'KOSDAQ';
}

export interface USStock extends Stock {
  exchange: string;
  currency: 'USD';
}

export interface IntlStock extends Stock {
  exchange: string;
  currency: string;
}

export interface PortfolioItem {
  id: number;
  symbol: string;
  name: string;
  quantity: number;
  averagePrice: number;
  currentPrice: number;
  totalValue: number;
  profitLoss: number;
  profitLossPercent: number;
  stockType: 'korea' | 'us';
}

export interface MarketIndex {
  name: string;
  value: number;
  change: number;
  changePercent: number;
}

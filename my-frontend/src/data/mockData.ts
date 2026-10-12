export type MarketDirection = "up" | "down" | "flat";
export type DataStatus = "live" | "delayed" | "closed";

export interface TickerItem {
  id: string;
  name: string;
  price: number;
  change: number;
  changeRate: number;
  direction: MarketDirection;
  status: DataStatus;
}

export interface MarketRow {
  id: string;
  name: string;
  symbol: string;
  market: string;
  price: number;
  change: number;
  changeRate: number;
  high: number;
  low: number;
  volume: string;
  direction: MarketDirection;
  status: DataStatus;
  updatedAt: string;
}

export interface NewsItem {
  id: string;
  category: string;
  title: string;
  source: string;
  publishedAt: string;
  thumbnail: string;
  url?: string;
}

export interface CalendarEvent {
  id: string;
  date: string;
  time: string;
  country: string;
  event: string;
  impact: "high" | "medium" | "low";
  forecast: string;
  previous: string;
  actual: string | null;
}

export const mockTickerData: TickerItem[] = [
  {
    id: "kospi",
    name: "KOSPI",
    price: 2680.45,
    change: 24.12,
    changeRate: 0.91,
    direction: "up",
    status: "live",
  },
  {
    id: "kosdaq",
    name: "KOSDAQ",
    price: 842.13,
    change: -8.42,
    changeRate: -0.99,
    direction: "down",
    status: "live",
  },
  {
    id: "usd-krw",
    name: "USD/KRW",
    price: 1382.4,
    change: 3.2,
    changeRate: 0.23,
    direction: "up",
    status: "live",
  },
  {
    id: "nasdaq",
    name: "NASDAQ",
    price: 17850.2,
    change: -45.6,
    changeRate: -0.25,
    direction: "down",
    status: "live",
  },
  {
    id: "sp500",
    name: "S&P 500",
    price: 5420.5,
    change: 18.2,
    changeRate: 0.34,
    direction: "up",
    status: "live",
  },
  {
    id: "dow",
    name: "DOW",
    price: 39500.8,
    change: 125.4,
    changeRate: 0.32,
    direction: "up",
    status: "live",
  },
];

export const mockMarketOverview: MarketRow[] = [
  {
    id: "kospi",
    name: "KOSPI",
    symbol: "KOSPI",
    market: "국내 지수",
    price: 2680.45,
    change: 24.12,
    changeRate: 0.91,
    high: 2694.21,
    low: 2651.32,
    volume: "12.4B",
    direction: "up",
    status: "live",
    updatedAt: "15:32",
  },
  {
    id: "kosdaq",
    name: "KOSDAQ",
    symbol: "KOSDAQ",
    market: "국내 지수",
    price: 842.13,
    change: -8.42,
    changeRate: -0.99,
    high: 851.48,
    low: 837.22,
    volume: "8.1B",
    direction: "down",
    status: "live",
    updatedAt: "15:30",
  },
  {
    id: "samsung",
    name: "삼성전자",
    symbol: "005930",
    market: "국내 주식",
    price: 73500,
    change: 1200,
    changeRate: 1.66,
    high: 74100,
    low: 72100,
    volume: "18.2M",
    direction: "up",
    status: "live",
    updatedAt: "15:31",
  },
  {
    id: "nvda",
    name: "NVIDIA",
    symbol: "NVDA",
    market: "미국 주식",
    price: 892.5,
    change: -12.3,
    changeRate: -1.36,
    high: 905.2,
    low: 888.1,
    volume: "42.1M",
    direction: "down",
    status: "live",
    updatedAt: "04:00",
  },
];

export const mockNewsList: NewsItem[] = [
  {
    id: "news-1",
    category: "시장",
    title: "글로벌 금융시장 주요 지표와 투자자 관심 종목 동향",
    source: "샘플 뉴스",
    publishedAt: "2026-09-29T15:10:00+09:00",
    thumbnail: "/images/news-placeholder.svg",
  },
  {
    id: "news-2",
    category: "경제",
    title: "주요 경제 이벤트를 앞두고 시장 변동성 확대",
    source: "샘플 경제뉴스",
    publishedAt: "2026-09-29T14:45:00+09:00",
    thumbnail: "/images/news-placeholder.svg",
  },
  {
    id: "news-3",
    category: "기업",
    title: "반도체 업종 실적 전망과 글로벌 수요 회복 신호",
    source: "샘플 산업뉴스",
    publishedAt: "2026-09-29T13:20:00+09:00",
    thumbnail: "/images/news-placeholder.svg",
  },
];

export const mockCalendarEvents: CalendarEvent[] = [
  {
    id: "event-1",
    date: "2026-09-29",
    time: "15:30",
    country: "US",
    event: "소비자물가지수 발표",
    impact: "high",
    forecast: "3.2%",
    previous: "3.1%",
    actual: null,
  },
  {
    id: "event-2",
    date: "2026-09-29",
    time: "21:00",
    country: "유럽",
    event: "금리 결정",
    impact: "high",
    forecast: "4.00%",
    previous: "4.00%",
    actual: null,
  },
  {
    id: "event-3",
    date: "2026-09-29",
    time: "10:00",
    country: "KR",
    event: "수출입 동향 발표",
    impact: "medium",
    forecast: "+2.1%",
    previous: "+1.8%",
    actual: null,
  },
];

export const mockSearchResults = [
  { id: "s1", name: "삼성전자", symbol: "005930", type: "국내 주식" },
  { id: "s2", name: "삼성SDI", symbol: "006400", type: "국내 주식" },
  { id: "s3", name: "삼성 관련 뉴스", symbol: "news", type: "관련 뉴스" },
];

export const marketTabs = [
  { id: "indices", label: "지수" },
  { id: "stocks", label: "주식" },
  { id: "forex", label: "외환" },
  { id: "crypto", label: "암호화폐" },
  { id: "commodities", label: "원자재" },
];

/** @deprecated CHART_HUB_PERIODS / SIDEBAR_CHART_PERIODS 사용 */
export { SIDEBAR_CHART_PERIODS as chartPeriods } from "@/config/chartPeriods";

export const mockChartData = [
  { time: "09:00", value: 2650 },
  { time: "10:00", value: 2662 },
  { time: "11:00", value: 2658 },
  { time: "12:00", value: 2671 },
  { time: "13:00", value: 2665 },
  { time: "14:00", value: 2678 },
  { time: "15:00", value: 2680 },
];

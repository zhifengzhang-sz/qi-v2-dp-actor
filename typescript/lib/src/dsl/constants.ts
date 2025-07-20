/**
 * Common constants for market data DSL
 * Provides pre-defined exchanges, timeframes, and depth levels for convenience
 */

import type { Exchange, Levels, Timeframe } from "./types.js";

/**
 * Common cryptocurrency and traditional exchanges
 */
export const EXCHANGES = {
  // Cryptocurrency Exchanges
  BINANCE: {
    id: "BINANCE",
    name: "Binance",
    mic: null,
    timezone: "UTC",
  } as const satisfies Exchange,

  COINBASE: {
    id: "COINBASE",
    name: "Coinbase Pro",
    mic: null,
    timezone: "America/New_York",
  } as const satisfies Exchange,

  KRAKEN: {
    id: "KRAKEN",
    name: "Kraken Digital Asset Exchange",
    mic: null,
    timezone: "UTC",
  } as const satisfies Exchange,

  BITFINEX: {
    id: "BITFINEX",
    name: "Bitfinex",
    mic: null,
    timezone: "UTC",
  } as const satisfies Exchange,

  BYBIT: {
    id: "BYBIT",
    name: "Bybit",
    mic: null,
    timezone: "UTC",
  } as const satisfies Exchange,

  // Traditional Exchanges
  NYSE: {
    id: "NYSE",
    name: "New York Stock Exchange",
    mic: "XNYS",
    timezone: "America/New_York",
  } as const satisfies Exchange,

  NASDAQ: {
    id: "NASDAQ",
    name: "NASDAQ Stock Market",
    mic: "XNAS",
    timezone: "America/New_York",
  } as const satisfies Exchange,

  LSE: {
    id: "LSE",
    name: "London Stock Exchange",
    mic: "XLON",
    timezone: "Europe/London",
  } as const satisfies Exchange,

  TSE: {
    id: "TSE",
    name: "Tokyo Stock Exchange",
    mic: "XTKS",
    timezone: "Asia/Tokyo",
  } as const satisfies Exchange,

  EURONEXT: {
    id: "EURONEXT",
    name: "Euronext",
    mic: "XPAR",
    timezone: "Europe/Paris",
  } as const satisfies Exchange,
} as const;

/**
 * Common timeframes for OHLCV data
 */
export const TIMEFRAMES = {
  // Seconds
  ONE_SECOND: "1s",
  FIVE_SECONDS: "5s",
  FIFTEEN_SECONDS: "15s",
  THIRTY_SECONDS: "30s",

  // Minutes
  ONE_MINUTE: "1m",
  FIVE_MINUTES: "5m",
  FIFTEEN_MINUTES: "15m",
  THIRTY_MINUTES: "30m",

  // Hours
  ONE_HOUR: "1h",
  TWO_HOURS: "2h",
  FOUR_HOURS: "4h",
  SIX_HOURS: "6h",
  EIGHT_HOURS: "8h",
  TWELVE_HOURS: "12h",

  // Days
  ONE_DAY: "1d",
  THREE_DAYS: "3d",

  // Weeks
  ONE_WEEK: "1w",
  TWO_WEEKS: "2w",

  // Months
  ONE_MONTH: "1M",
  THREE_MONTHS: "3M",
  SIX_MONTHS: "6M",

  // Years
  ONE_YEAR: "1Y",
} as const satisfies Record<string, Timeframe>;

/**
 * Common market depth levels
 */
export const DEPTH_LEVELS = {
  TOP_1: 1,
  TOP_5: 5,
  TOP_10: 10,
  TOP_20: 20,
  TOP_50: 50,
  TOP_100: 100,
  TOP_200: 200,
  TOP_500: 500,
  FULL_BOOK: 1000,
} as const satisfies Record<string, Levels>;

/**
 * Common market data intervals in milliseconds
 */
export const INTERVALS_MS = {
  ONE_SECOND: 1000,
  ONE_MINUTE: 60000,
  FIVE_MINUTES: 300000,
  FIFTEEN_MINUTES: 900000,
  THIRTY_MINUTES: 1800000,
  ONE_HOUR: 3600000,
  FOUR_HOURS: 14400000,
  ONE_DAY: 86400000,
  ONE_WEEK: 604800000,
} as const;

/**
 * Currency codes commonly used in market data
 */
export const CURRENCIES = {
  // Fiat Currencies
  USD: "USD",
  EUR: "EUR",
  GBP: "GBP",
  JPY: "JPY",
  CHF: "CHF",
  CAD: "CAD",
  AUD: "AUD",
  CNY: "CNY",
  KRW: "KRW",

  // Cryptocurrencies
  BTC: "BTC",
  ETH: "ETH",
  BNB: "BNB",
  ADA: "ADA",
  SOL: "SOL",
  DOT: "DOT",
  AVAX: "AVAX",
  MATIC: "MATIC",

  // Stablecoins
  USDT: "USDT",
  USDC: "USDC",
  DAI: "DAI",
  BUSD: "BUSD",
} as const;

/**
 * Common trading pairs for cryptocurrency markets
 */
export const TRADING_PAIRS = {
  // Major BTC pairs
  BTC_USD: "BTC/USD",
  BTC_USDT: "BTC/USDT",
  BTC_EUR: "BTC/EUR",

  // Major ETH pairs
  ETH_USD: "ETH/USD",
  ETH_USDT: "ETH/USDT",
  ETH_BTC: "ETH/BTC",

  // Altcoin pairs
  ADA_USD: "ADA/USD",
  SOL_USD: "SOL/USD",
  DOT_USD: "DOT/USD",
  AVAX_USD: "AVAX/USD",
} as const;

/**
 * Common asset classes and their descriptions
 */
export const ASSET_CLASSES = {
  STOCK: {
    name: "Stock",
    description: "Equity securities representing ownership in corporations",
  },
  CRYPTO: {
    name: "Cryptocurrency",
    description: "Digital assets and cryptocurrencies",
  },
  CURRENCY: {
    name: "Currency",
    description: "Fiat currencies and foreign exchange pairs",
  },
  COMMODITY: {
    name: "Commodity",
    description: "Physical goods like metals, energy, and agricultural products",
  },
  BOND: {
    name: "Bond",
    description: "Fixed-income debt securities",
  },
  INDEX: {
    name: "Index",
    description: "Market indices and composite securities",
  },
} as const;

/**
 * Common market types and their descriptions
 */
export const MARKET_TYPES = {
  EQUITY: {
    name: "Equity",
    description: "Stock markets and equity trading",
  },
  CRYPTO: {
    name: "Cryptocurrency",
    description: "Cryptocurrency and digital asset markets",
  },
  FOREX: {
    name: "Foreign Exchange",
    description: "Currency trading and foreign exchange markets",
  },
  COMMODITY: {
    name: "Commodity",
    description: "Commodity trading and futures markets",
  },
  BOND: {
    name: "Bond",
    description: "Fixed-income and debt securities markets",
  },
  DERIVATIVE: {
    name: "Derivative",
    description: "Options, futures, and other derivative instruments",
  },
} as const;

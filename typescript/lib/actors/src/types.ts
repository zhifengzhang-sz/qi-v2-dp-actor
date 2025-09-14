/**
 * JSON schemas for DSL types and MCP tool definitions
 *
 * These schemas define the input/output structure for MCP tools
 * that expose DSL operations.
 */

// Core DSL type schemas
export const MarketSchema = {
  type: "object",
  properties: {
    id: { type: "string" },
    name: { type: "string" },
    type: { type: "string" },
  },
  required: ["id", "name", "type"],
} as const;

export const ExchangeSchema = {
  type: "object",
  properties: {
    id: { type: "string" },
    name: { type: "string" },
    country: { type: "string" },
  },
  required: ["id", "name"],
} as const;

export const InstrumentSchema = {
  type: "object",
  properties: {
    symbol: { type: "string" },
    name: { type: "string" },
    type: { type: "string" },
  },
  required: ["symbol", "name", "type"],
} as const;

export const DataContextSchema = {
  type: "object",
  properties: {
    market: MarketSchema,
    exchange: ExchangeSchema,
    instrument: InstrumentSchema,
  },
  required: ["market", "exchange", "instrument"],
} as const;

export const DataContextArraySchema = {
  type: "object",
  properties: {
    contexts: {
      type: "array",
      items: DataContextSchema,
    },
  },
  required: ["contexts"],
} as const;

// Date range schema
export const DateRangeSchema = {
  type: "object",
  properties: {
    startDate: { type: "string", format: "date-time" },
    endDate: { type: "string", format: "date-time" },
  },
  required: ["startDate", "endDate"],
} as const;

// Timeframe schema
export const TimeframeSchema = {
  type: "string",
  enum: ["1m", "5m", "15m", "30m", "1h", "4h", "1d", "1w", "1M"],
} as const;

// Levels schema
export const LevelsSchema = {
  type: "object",
  properties: {
    bids: { type: "number", minimum: 1 },
    asks: { type: "number", minimum: 1 },
  },
  required: ["bids", "asks"],
} as const;

// Market data schemas
export const PriceDataSchema = {
  type: "object",
  properties: {
    context: DataContextSchema,
    data: {
      type: "object",
      properties: {
        timestamp: { type: "string", format: "date-time" },
        price: { type: "string" }, // FinancialDecimal as string
        size: { type: "string" }, // FinancialDecimal as string
        tradeId: { type: "string" },
        aggressor: { type: "string", enum: ["BUY", "SELL"] },
      },
      required: ["timestamp", "price", "size"],
    },
  },
  required: ["context", "data"],
} as const;

export const PriceDataArraySchema = {
  type: "object",
  properties: {
    marketData: {
      type: "array",
      items: PriceDataSchema,
    },
  },
  required: ["marketData"],
} as const;

export const Level1DataSchema = {
  type: "object",
  properties: {
    context: DataContextSchema,
    data: {
      type: "object",
      properties: {
        timestamp: { type: "string", format: "date-time" },
        bid: { type: "string" },
        ask: { type: "string" },
        bidSize: { type: "string" },
        askSize: { type: "string" },
      },
      required: ["timestamp", "bid", "ask", "bidSize", "askSize"],
    },
  },
  required: ["context", "data"],
} as const;

export const OHLCVDataSchema = {
  type: "object",
  properties: {
    context: DataContextSchema,
    data: {
      type: "object",
      properties: {
        timestamp: { type: "string", format: "date-time" },
        open: { type: "string" },
        high: { type: "string" },
        low: { type: "string" },
        close: { type: "string" },
        volume: { type: "string" },
        timeframe: TimeframeSchema,
      },
      required: ["timestamp", "open", "high", "low", "close", "volume", "timeframe"],
    },
  },
  required: ["context", "data"],
} as const;

export const OHLCVDataArraySchema = {
  type: "object",
  properties: {
    marketData: {
      type: "array",
      items: OHLCVDataSchema,
    },
  },
  required: ["marketData"],
} as const;

export const MarketDepthDataSchema = {
  type: "object",
  properties: {
    context: DataContextSchema,
    data: {
      type: "object",
      properties: {
        timestamp: { type: "string", format: "date-time" },
        bids: {
          type: "array",
          items: {
            type: "object",
            properties: {
              price: { type: "string" },
              size: { type: "string" },
            },
            required: ["price", "size"],
          },
        },
        asks: {
          type: "array",
          items: {
            type: "object",
            properties: {
              price: { type: "string" },
              size: { type: "string" },
            },
            required: ["price", "size"],
          },
        },
      },
      required: ["timestamp", "bids", "asks"],
    },
    levels: LevelsSchema,
  },
  required: ["context", "data", "levels"],
} as const;

// Reader operation schemas
export const GetCurrentPriceSchema = {
  type: "object",
  properties: {
    context: DataContextSchema,
  },
  required: ["context"],
} as const;

export const GetCurrentPricesSchema = DataContextArraySchema;

export const GetLevel1Schema = {
  type: "object",
  properties: {
    context: DataContextSchema,
  },
  required: ["context"],
} as const;

export const GetMarketDepthSchema = {
  type: "object",
  properties: {
    context: DataContextSchema,
    levels: LevelsSchema,
  },
  required: ["context", "levels"],
} as const;

export const GetOHLCVSchema = {
  type: "object",
  properties: {
    context: DataContextSchema,
    timeframe: TimeframeSchema,
  },
  required: ["context", "timeframe"],
} as const;

export const GetHistorySchema = {
  type: "object",
  properties: {
    context: DataContextSchema,
    range: DateRangeSchema,
  },
  required: ["context", "range"],
} as const;

export const GetOHLCVHistorySchema = {
  type: "object",
  properties: {
    context: DataContextSchema,
    timeframe: TimeframeSchema,
    range: DateRangeSchema,
  },
  required: ["context", "timeframe", "range"],
} as const;

// Writer operation schemas
export const PublishPriceSchema = PriceDataSchema;
export const PublishPricesSchema = PriceDataArraySchema;
export const PublishLevel1Schema = Level1DataSchema;
export const PublishOHLCVSchema = OHLCVDataSchema;
export const PublishOHLCVBatchSchema = OHLCVDataArraySchema;
export const PublishMarketDepthSchema = MarketDepthDataSchema;

// Streaming operation schemas
export const SubscriptionSchema = {
  type: "object",
  properties: {
    context: DataContextSchema,
    clientId: { type: "string" },
  },
  required: ["context", "clientId"],
} as const;

export const SubscriptionWithLevelsSchema = {
  type: "object",
  properties: {
    context: DataContextSchema,
    levels: LevelsSchema,
    clientId: { type: "string" },
  },
  required: ["context", "levels", "clientId"],
} as const;

export const SubscriptionWithTimeframeSchema = {
  type: "object",
  properties: {
    context: DataContextSchema,
    timeframe: TimeframeSchema,
    clientId: { type: "string" },
  },
  required: ["context", "timeframe", "clientId"],
} as const;

export const UnsubscribeSchema = {
  type: "object",
  properties: {
    subscriptionId: { type: "string" },
  },
  required: ["subscriptionId"],
} as const;

// Stream management schemas
export const StreamContextSchema = {
  type: "object",
  properties: {
    context: DataContextSchema,
  },
  required: ["context"],
} as const;

export const StreamWithLevelsSchema = {
  type: "object",
  properties: {
    context: DataContextSchema,
    levels: LevelsSchema,
  },
  required: ["context", "levels"],
} as const;

export const StreamWithTimeframeSchema = {
  type: "object",
  properties: {
    context: DataContextSchema,
    timeframe: TimeframeSchema,
  },
  required: ["context", "timeframe"],
} as const;

export const StreamWriteSchema = {
  type: "object",
  properties: {
    streamId: { type: "string" },
    data: { type: "object" },
  },
  required: ["streamId", "data"],
} as const;

export const StopStreamSchema = {
  type: "object",
  properties: {
    streamId: { type: "string" },
  },
  required: ["streamId"],
} as const;

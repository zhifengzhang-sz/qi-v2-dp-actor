# @qi/dp Market Data DSL Specification

This document defines pure market data contracts for reading and writing financial market data. The DSL is completely language-agnostic and focuses solely on data structures and operations, independent of any specific readers, writers, or data sources.

**Dependencies**: This specification builds on `@qi/base` and `@qi/core` foundation modules for error handling and infrastructure services.

## Core Principle

> **The DSL defines the vocabulary (data types) and grammar (operations) of market data. Context, routing, and behavior are the responsibility of implementers.**

## Foundation Dependencies

### @qi/base Usage (Required)

All DSL operations must use foundation error handling:

```yaml
foundation_error_handling:
  all_operations_return: "Result<T> where T is the expected data type"
  error_propagation: "QiError with appropriate ErrorCategory"
  composition: "Result<T> enables functional composition of operations"
  
error_categories_used:
  VALIDATION: "Invalid symbol format, malformed context data"
  NOT_FOUND: "Symbol not found, market data unavailable"
  NETWORK: "API timeouts, connection failures"
  PARSING: "Invalid data format from external sources"
  TIMEOUT: "Operation time limit exceeded"

example_signatures:
  - "getCurrentPrice: DataContext → Result<MarketData<Price>>"
  - "writePrice: MarketData<Price> → Result<Void>"
  - "getMarketAnalytics: Market → Result<MarketData<MarketAnalytics>>"
```

### @qi/core Usage (Required)

DSL implementations MUST use foundation infrastructure modules:

```yaml
required_infrastructure:
  configuration:
    purpose: "Configure data sources, API keys, rate limits"
    usage: "Reader/Writer initialization and settings"
    example: "CoinGeckoConfig loaded from config module"
    module: "@qi/core/config"
  
  logging:
    purpose: "Structured logging of market data operations"
    usage: "Operation tracing, error diagnostics, performance monitoring"
    context: "Include symbol, exchange, operation type in log context"
    module: "@qi/core/logger"
  
  caching:
    purpose: "Cache market data for performance optimization"
    usage: "Price caching, rate limiting, expensive operations"
    ttl: "Respect market data freshness requirements"
    module: "@qi/core/cache"

mandatory_modules:
  - "@qi/core/config - Configuration management and validation"
  - "@qi/core/logger - Structured logging with context"
  - "@qi/core/cache - Caching layer for performance optimization"
  - "@qi/base/result - Error handling with Result<T> (foundation requirement)"
```

## Precision Requirements

Financial data integrity requires precise decimal handling across all numeric fields:

```yaml
precision_requirements:
  price_fields:
    requirement: "minimum 8 decimal places for price precision"
    recommendation: "arbitrary precision arithmetic to prevent rounding errors"
    examples: ["price", "bidPrice", "askPrice", "open", "high", "low", "close"]
    
  volume_fields:
    requirement: "arbitrary precision (no rounding for cumulative calculations)"
    rationale: "volume aggregations must maintain mathematical accuracy"
    examples: ["volume", "baseVolume", "quoteVolume", "size"]
    
  percentage_fields:
    requirement: "minimum 4 decimal places (basis points precision)"
    rationale: "financial percentage calculations require basis point accuracy"
    examples: ["change24h", "changePercentage", "dominancePercentage"]
    
  ratio_fields:
    requirement: "minimum 6 decimal places for ratio calculations"
    examples: ["volatilityRatio", "priceToVolumeRatio"]

implementation_guidance:
  decimal_libraries:
    haskell: "Use Data.Decimal or similar arbitrary precision library"
    typescript: "Use decimal.js or big.js for financial calculations"
    javascript: "Avoid native Number for financial calculations"
  
  validation_rules:
    - "All price fields must be positive finite numbers"
    - "No NaN or Infinity values allowed in any numeric field"
    - "Percentage fields must be within reasonable bounds (-100% to +∞)"
    - "Volume fields must be non-negative"
```

## Batch Operation Semantics

Batch operations (operations accepting List<T> parameters) require consistent error handling and partial failure semantics:

```yaml
batch_operation_semantics:
  read_operations:
    getCurrentPrices:
      partial_failure_handling: "return successful results with error details for failed contexts"
      empty_input: "return empty list as successful Result<[]>"
      failure_threshold: "fail entire operation if >75% of individual contexts fail"
      ordering: "results must maintain same order as input contexts"
      error_aggregation: "collect all individual errors into batch error details"
    
    getPriceHistory:
      batch_behavior: "single context with date range - not a true batch operation"
      failure_handling: "complete failure if any part of date range fails"
    
  write_operations:
    writePrices:
      atomicity: "no transaction guarantees - each write is independent"
      partial_failure_handling: "continue processing all items, report failures in Result"
      error_collection: "aggregate all write failures with context information"
      success_criteria: "operation succeeds if >50% of writes succeed"
      ordering: "process writes in input order, but no ordering guarantees on completion"
    
    writeOHLCVBatch:
      atomicity: "no cross-item transaction requirements"
      validation: "validate each OHLCV item independently before processing"
      failure_handling: "continue processing valid items, collect validation failures"

  general_principles:
    partial_success: "batch operations can succeed with partial failures"
    error_reporting: "failed items must be clearly identified in error details"
    resource_cleanup: "implementers must handle resource cleanup for partial failures"
    retry_semantics: "failed items from batch can be retried individually"
    performance: "batch operations should be more efficient than individual calls"

implementation_requirements:
  error_structure:
    batch_error_type: "BatchError containing individual operation results"
    success_items: "list of successfully processed items with their contexts"
    failed_items: "list of failed items with specific error details"
    
  validation_order:
    - "validate all input items before processing any"
    - "collect all validation errors before reporting batch failure"
    - "process only valid items if partial validation failures occur"
    
  logging_requirements:
    - "log batch operation start with item count"
    - "log individual failures with context identification"
    - "log batch completion with success/failure statistics"
```

## Time Handling Guidance

Consistent timestamp handling is critical for financial data integrity and cross-system compatibility:

```yaml
time_handling_recommendations:
  timezone_requirements:
    mandate: "all timestamps MUST include timezone information"
    preferred_format: "ISO 8601 with explicit timezone (e.g., 2024-01-15T14:30:00.123Z)"
    rationale: "prevents ambiguity in global market data processing"
    
  precision_recommendations:
    high_frequency_data: "microsecond precision for trade data and level 1 quotes"
    analytical_data: "millisecond precision sufficient for OHLCV and market analytics"
    historical_data: "second precision acceptable for daily aggregations"
    
  clock_synchronization:
    source_timestamps: "preserve original exchange timestamps when available"
    processing_timestamps: "add processing timestamp for audit trails"
    skew_tolerance: "implementations should handle reasonable clock skew (±2 seconds)"
    ntp_recommendation: "trading systems should use NTP for time synchronization"

  timestamp_fields:
    required_fields:
      - "timestamp: data creation time at source"
    optional_fields:
      - "receivedAt: timestamp when data was received by system"
      - "processedAt: timestamp when data processing completed"
    
  validation_rules:
    future_timestamps: "reject timestamps more than 5 minutes in the future"
    stale_timestamps: "warn on timestamps older than reasonable for data type"
    ordering: "maintain temporal ordering within data streams"

implementation_guidance:
  libraries:
    haskell: "Use Data.Time.Clock.POSIX with timezone-aware parsing"
    typescript: "Use date-fns or moment.js with explicit timezone handling"
    general: "avoid language built-in date handling without timezone support"
    
  best_practices:
    - "store all timestamps in UTC internally"
    - "convert to local timezone only for display purposes"
    - "validate timestamp formats at system boundaries"
    - "log timezone conversion operations for debugging"
    - "handle daylight saving time transitions gracefully"
```

## Market Data Architecture

### Two-Part Structure

Market data consists of two distinct parts:

1. **Data Context**: Market, exchange, and instrument identification
2. **Core Market Data**: Pure price/quote/volume data compliant with FIX Protocol

```yaml
MarketData:
  context: DataContext        # WHO/WHERE/WHAT identification
  coreData: CoreMarketData   # PURE market data (FIX compliant)
```

## Data Context Types

### DataContext Contract

**Purpose**: Identifies the market, exchange, and instrument for the data

```yaml
DataContext:
  market: Market           # Market classification
  exchange: Exchange       # Exchange identification  
  instrument: Instrument   # Financial instrument details
  
laws:
  - "all fields must be non-null"
  - "context provides complete identification"
  - "context is separate from core market data"
```

### Market Contract

**Structure Type**: Product Type

```yaml
Market:
  # Product type with MarketType field
  type: MarketType          # Market classification (EQUITY, CRYPTO, etc.)
  region: String           # Geographic region (US, EU, ASIA, GLOBAL)
  segment: String          # Market segment (CASH, FUTURES, OPTIONS)

MarketType:
  # Enum for market classification
  enum: ["EQUITY", "CRYPTO", "FOREX", "COMMODITY", "BOND", "DERIVATIVE"]
  
laws:
  - "type must be valid MarketType enum value"
  - "region must be ISO country code or GLOBAL"
  - "segment must be valid trading mechanism (CASH, FUTURES, OPTIONS)"
  - "all fields are immutable after construction"

json_schema_representation:
  type: object
  properties:
    type:
      type: string
      enum: ["EQUITY", "CRYPTO", "FOREX", "COMMODITY", "BOND", "DERIVATIVE"]
    region:
      type: string
      pattern: "^[A-Z]{2}|GLOBAL$"
    segment:
      type: string
      enum: ["CASH", "FUTURES", "OPTIONS"]
  required: ["type", "region", "segment"]
```

### Exchange Contract

**Structure Type**: Product Type (Data Class/Record)

```yaml
Exchange:
  # Product type with named fields (all fields always present)
  fields:
    id: String              # Unique exchange identifier
    name: String            # Human-readable exchange name
    mic: String | null      # ISO 10383 Market Identifier Code (optional)
    timezone: String        # Exchange timezone (IANA)
  
laws:
  - "id must be unique across all exchanges"
  - "id must be non-empty alphanumeric string"
  - "name must be non-empty human-readable string"
  - "mic must be valid ISO 10383 code when provided, null otherwise"
  - "timezone must be valid IANA timezone identifier"
  - "all fields are immutable after construction"

json_schema_representation:
  type: object
  properties:
    id:
      type: string
      pattern: "^[A-Z0-9_]+$"
      minLength: 1
      maxLength: 50
    name:
      type: string
      minLength: 1
      maxLength: 200
    mic:
      oneOf:
        - type: string
          pattern: "^[A-Z]{4}$"  # ISO 10383 4-character code
        - type: "null"
    timezone:
      type: string
      pattern: "^[A-Za-z]+/[A-Za-z_]+$"  # IANA timezone format
  required: ["id", "name", "mic", "timezone"]
  additionalProperties: false

examples:
  - {id: "NYSE", name: "New York Stock Exchange", mic: "XNYS", timezone: "America/New_York"}
  - {id: "BINANCE", name: "Binance", mic: null, timezone: "UTC"}
  - {id: "COINBASE", name: "Coinbase Pro", mic: null, timezone: "America/New_York"}
  - {id: "KRAKEN", name: "Kraken Digital Asset Exchange", mic: null, timezone: "UTC"}

algebraic_specification:
  # Exchange is a product type (tuple) with named fields
  Exchange = (id: String, name: String, mic: String?, timezone: String)
  
  # Constructor function specification
  mkExchange: String -> String -> (String | null) -> String -> Exchange
  
  # Accessor functions
  getId: Exchange -> String
  getName: Exchange -> String
  getMic: Exchange -> (String | null)
  getTimezone: Exchange -> String
```

### Instrument Contract

**Structure Type**: Product Type (Data Class/Record)

```yaml
Instrument:
  # Product type with named fields (all fields always present)
  fields:
    symbol: String          # Exchange-specific symbol
    isin: String | null     # International Securities Identification Number (optional)
    name: String           # Human-readable instrument name
    assetClass: AssetClass # Classification of the underlying asset
    currency: String       # Base currency (ISO 4217)
  
laws:
  - "symbol must be non-empty exchange-specific identifier"
  - "isin must be valid ISIN format when provided, null otherwise"
  - "name must be non-empty human-readable string"
  - "assetClass must be valid AssetClass enum value"
  - "currency must be valid ISO 4217 currency code"
  - "all fields are immutable after construction"

AssetClass:
  # Simple enum type
  enum: ["STOCK", "CRYPTO", "CURRENCY", "COMMODITY", "BOND", "INDEX"]
  descriptions:
    STOCK: "Equity shares"
    CRYPTO: "Cryptocurrency tokens"
    CURRENCY: "Fiat currencies"
    COMMODITY: "Physical commodities"
    BOND: "Fixed income securities"
    INDEX: "Market indices"

json_schema_representation:
  type: object
  properties:
    symbol:
      type: string
      minLength: 1
      maxLength: 50
      pattern: "^[A-Z0-9\\-_\\.]+$"
    isin:
      oneOf:
        - type: string
          pattern: "^[A-Z]{2}[A-Z0-9]{10}$"  # ISO 6166 ISIN format
        - type: "null"
    name:
      type: string
      minLength: 1
      maxLength: 200
    assetClass:
      type: string
      enum: ["STOCK", "CRYPTO", "CURRENCY", "COMMODITY", "BOND", "INDEX"]
    currency:
      type: string
      pattern: "^[A-Z]{3}$"  # ISO 4217 3-character code
  required: ["symbol", "isin", "name", "assetClass", "currency"]
  additionalProperties: false

algebraic_specification:
  # Instrument is a product type with named fields
  Instrument = (symbol: String, isin: String?, name: String, assetClass: AssetClass, currency: String)
  
  # Constructor function specification
  mkInstrument: String -> (String | null) -> String -> AssetClass -> String -> Instrument
  
  # Accessor functions
  getSymbol: Instrument -> String
  getIsin: Instrument -> (String | null)
  getName: Instrument -> String
  getAssetClass: Instrument -> AssetClass
  getCurrency: Instrument -> String
```

## Contract Categories Overview

### All DSL Contracts by Category

| Category | Contract | Type | Purpose | FIX Compliance |
|----------|----------|------|---------|----------------|
| **Context Types** | `DataContext` | Product | Market/Exchange/Instrument ID | N/A |
| | `Market` | Product | Market classification | N/A |
| | `Exchange` | Product | Exchange identification | N/A |
| | `Instrument` | Product | Financial instrument details | N/A |
| **Core Data Types** | `Price` | Product | Real-time trade data | MDEntryType=2 (Trade) |
| | `Level1` | Product | Top-of-book quotes | MDEntryType=0/1 (Bid/Offer) |
| | `OHLCV` | Product | Time-series aggregated data | Derived from Trade aggregations |
| | `MarketDepth` | Product | Multi-level order book | Multi-level MDEntryType=0/1 |
| | `MarketAnalytics` | Product | Market statistics | Derived from FIX data |
| **Support Types** | `DepthLevel` | Product | Single order book level | FIX price level |
| | `DominanceMetrics` | Product | Market share percentages | Derived |
| | `ChangeMetrics` | Product | Period-over-period changes | Derived |
| | `VolatilityMetrics` | Product | Volatility measures | Derived |
| | `AssetClass` | Enum | Asset classification | N/A |
| | `MarketType` | Enum | Market type classification | N/A |
| | `Side` | Enum | Trade aggressor side | FIX Tag 54 |
| | `ContextQuery` | Product | Context query criteria | N/A |
| **Context Management** | `MarketDataContextManager` | Interface | Context lifecycle management | N/A |
| **Reading Operations** | `MarketDataReader` | Interface | Current data retrieval | All FIX compliant |
| | `HistoricalMarketDataReader` | Interface | Historical data retrieval | All FIX compliant |
| | `StreamingMarketDataReader` | Interface | Real-time data streaming | All FIX compliant |
| **Writing Operations** | `MarketDataWriter` | Interface | Data writing | All FIX compliant |
| | `HistoricalMarketDataWriter` | Interface | Historical data writing | All FIX compliant |
| | `StreamingMarketDataWriter` | Interface | Real-time data writing | All FIX compliant |
| **Composite Types** | `MarketData<T>` | Generic Product | Context + Core data wrapper | FIX compliant core data |
| | `DateRange` | Product | Time period specification | N/A |
| | `Timeframe` | Value | Time interval specification | N/A |
| | `Levels` | Value | Order book depth specification | N/A |

### Contract Type Legend
- **Product Type**: Data class/record with named fields (all fields always present)
- **Sum Type**: Discriminated union with type field as discriminator
- **Enum**: Simple enumeration of values
- **Interface**: Operation contract defining behavior
- **Generic**: Parameterized type with type variables
- **Value**: Simple primitive or value type

## Core Market Data Types (FIX Protocol Compliant)

### 1. Price Data Contract

**Purpose**: Real-time trade/tick data representing executed transactions  
**FIX Protocol**: MDEntryType=2 (Trade)

```yaml
Price:
  # Core FIX Protocol fields
  timestamp: DateTime      # FIX Tag 273 (MDEntryTime) - When trade occurred
  price: Decimal          # FIX Tag 270 (MDEntryPrice) - Trade execution price  
  size: Decimal           # FIX Tag 271 (MDEntrySize) - Trade quantity/volume
  
  # Extended FIX fields (optional)
  tradeId: String         # FIX Tag 1003 (TradeID) - Unique trade identifier
  aggressor: Side         # FIX Tag 54 (Side) - BUY or SELL aggressor
  
laws:
  - "timestamp must be valid ISO 8601 datetime"
  - "price must be positive decimal number"
  - "size must be positive decimal number"
  - "precision: minimum 8 decimal places for price"
  
fix_compliance:
  entry_type: "MDEntryType=2 (Trade)"
  required_tags: [273, 270, 271]
  optional_tags: [1003, 54]
```

### 2. Level1 Data Contract

**Purpose**: Top-of-book bid/ask quotes representing best available prices  
**FIX Protocol**: MDEntryType=0 (Bid) and MDEntryType=1 (Offer)

```yaml
Level1:
  # Core FIX Protocol fields
  timestamp: DateTime      # FIX Tag 273 (MDEntryTime) - When quote was observed
  bidPrice: Decimal       # FIX Tag 270 (MDEntryPrice) + MDEntryType=0 (Bid)
  bidSize: Decimal        # FIX Tag 271 (MDEntrySize) + MDEntryType=0 (Bid)
  askPrice: Decimal       # FIX Tag 270 (MDEntryPrice) + MDEntryType=1 (Offer)
  askSize: Decimal        # FIX Tag 271 (MDEntrySize) + MDEntryType=1 (Offer)
  
  # Extended FIX fields (optional)
  quoteId: String         # FIX Tag 117 (QuoteID) - Unique quote identifier
  bidTime: DateTime       # FIX Tag 273 (MDEntryTime) for bid specifically
  askTime: DateTime       # FIX Tag 273 (MDEntryTime) for ask specifically
  
laws:
  - "timestamp must be valid ISO 8601 datetime"
  - "bidPrice must be positive decimal number"
  - "askPrice must be positive decimal number"
  - "bidSize must be positive decimal number"
  - "askSize must be positive decimal number"
  - "askPrice >= bidPrice (no crossed market)"
  - "spread = askPrice - bidPrice >= 0"
  - "precision: minimum 8 decimal places for prices"
  
fix_compliance:
  entry_types: ["MDEntryType=0 (Bid)", "MDEntryType=1 (Offer)"]
  required_tags: [273, 270, 271]
  optional_tags: [117]
  market_data_entry: "Two entries: one for bid, one for ask"
```

### 3. OHLCV Data Contract

**Purpose**: Time-series aggregated price data for analysis and charting  
**FIX Protocol**: Derived from MDEntryType=2 (Trade) aggregations

```yaml
OHLCV:
  # Core aggregated fields (derived from FIX Trade entries)
  timestamp: DateTime      # Bar/candle start time (aggregation period start)
  open: Decimal           # First trade price in period (from FIX Tag 270)
  high: Decimal           # Highest trade price in period (from FIX Tag 270)
  low: Decimal            # Lowest trade price in period (from FIX Tag 270)
  close: Decimal          # Last trade price in period (from FIX Tag 270)
  volume: Decimal         # Total volume traded in period (sum of FIX Tag 271)
  
  # Extended aggregation fields (optional)
  tradeCount: Integer     # Number of trades in period
  weightedPrice: Decimal  # Volume-weighted average price (VWAP)
  
laws:
  - "timestamp must be valid ISO 8601 datetime"
  - "all prices must be positive decimal numbers"
  - "volume must be positive decimal number"
  - "low <= open <= high"
  - "low <= close <= high"
  - "low <= high (price range constraint)"
  - "precision: minimum 8 decimal places for prices"
  - "tradeCount must be positive integer when provided"
  
fix_compliance:
  derived_from: "MDEntryType=2 (Trade) aggregations"
  aggregation_fields: ["open: first 270", "high: max 270", "low: min 270", "close: last 270", "volume: sum 271"]
  industry_standard: "Standard financial time-series aggregation"
  used_by: ["Bloomberg", "Thomson Reuters", "TradingView"]
```

### 4. MarketDepth Data Contract

**Purpose**: Multi-level order book depth data  
**FIX Protocol**: MDEntryType=0 (Bid) and MDEntryType=1 (Offer) at multiple levels

```yaml
MarketDepth:
  # Core FIX Protocol fields
  timestamp: DateTime      # FIX Tag 273 (MDEntryTime) - When depth was captured
  bids: Array<DepthLevel> # Bid side of order book (MDEntryType=0)
  asks: Array<DepthLevel> # Ask side of order book (MDEntryType=1)
  
  # Extended fields
  bookId: String          # Unique order book snapshot identifier
  
laws:
  - "timestamp must be valid ISO 8601 datetime"
  - "bids must be sorted by price descending (highest first)"
  - "asks must be sorted by price ascending (lowest first)"
  - "bid prices must be <= ask prices (no crossed book)"
  - "all levels must have positive prices and sizes"

DepthLevel:
  price: Decimal          # FIX Tag 270 (MDEntryPrice) - Price level
  size: Decimal           # FIX Tag 271 (MDEntrySize) - Quantity at this level
  level: Integer          # FIX Tag 1023 (MDPriceLevel) - Book level (1=top)
  
fix_compliance:
  entry_types: ["MDEntryType=0 (Bid)", "MDEntryType=1 (Offer)"]
  required_tags: [273, 270, 271, 1023]
  market_data_entries: "Multiple entries per side, ordered by price level"
```

### 5. MarketAnalytics Data Contract

**Purpose**: Aggregate market statistics and derived metrics

```yaml
MarketAnalytics:
  # Core analytics fields
  timestamp: DateTime           # When analytics were calculated
  totalMarketCap: Decimal      # Total market capitalization
  totalVolume: Decimal         # Total trading volume (period-specific)
  instrumentCount: Integer     # Number of active instruments
  
  # Derived metrics
  dominanceMetrics: DominanceMetrics  # Market share percentages
  changeMetrics: ChangeMetrics        # Period-over-period changes
  volatilityMetrics: VolatilityMetrics # Market volatility measures
  
laws:
  - "timestamp must be valid ISO 8601 datetime"
  - "totalMarketCap must be positive decimal number"
  - "totalVolume must be positive decimal number"
  - "instrumentCount must be positive integer"
  - "all percentage values must be between -100 and 100"

DominanceMetrics:
  topInstrumentShare: Decimal    # Largest instrument market share (%)
  top5InstrumentShare: Decimal   # Top 5 instruments market share (%)
  top10InstrumentShare: Decimal  # Top 10 instruments market share (%)

ChangeMetrics:
  change1h: Decimal             # 1-hour percentage change
  change24h: Decimal            # 24-hour percentage change  
  change7d: Decimal             # 7-day percentage change
  change30d: Decimal            # 30-day percentage change

VolatilityMetrics:
  volatility24h: Decimal        # 24-hour price volatility (standard deviation)
  volatility7d: Decimal         # 7-day price volatility
  volatility30d: Decimal        # 30-day price volatility

fix_compliance:
  derived_from: "Aggregations of FIX market data entries"
  not_directly_mapped: "Analytics are computed from core FIX data"
  industry_standard: "Standard market analytics calculations"
```

## Support Types

### DateRange Contract

**Purpose**: Specifies a time period for historical data retrieval

```yaml
DateRange:
  # Product type with named fields
  fields:
    startDate: DateTime     # Start of the date range (inclusive)
    endDate: DateTime       # End of the date range (inclusive)
  
  laws:
    - "startDate must be valid ISO 8601 datetime"
    - "endDate must be valid ISO 8601 datetime"
    - "startDate <= endDate (valid time range)"
    - "both dates are inclusive in the range"

json_schema_representation:
  type: object
  properties:
    startDate:
      type: string
      format: date-time
    endDate:
      type: string
      format: date-time
  required: ["startDate", "endDate"]
  additionalProperties: false
```

### Timeframe Contract

**Purpose**: Specifies time intervals for aggregated data (OHLCV)

```yaml
Timeframe:
  # Value type (string with validation)
  type: String
  pattern: "^(\\d+[smhd]|\\d+[MS])$"
  
  valid_values:
    seconds: ["1s", "5s", "15s", "30s"]
    minutes: ["1m", "5m", "15m", "30m"]
    hours: ["1h", "2h", "4h", "6h", "8h", "12h"]
    days: ["1d", "3d", "7d"]
    weeks: ["1w", "2w", "4w"]
    months: ["1M", "3M", "6M", "12M"]
  
  laws:
    - "format must match pattern: number + unit"
    - "units: s (seconds), m (minutes), h (hours), d (days), w (weeks), M (months)"
    - "number must be positive integer"
    - "must represent a valid time interval"

examples:
  - "1m"     # 1 minute
  - "5m"     # 5 minutes  
  - "1h"     # 1 hour
  - "1d"     # 1 day
  - "1w"     # 1 week
  - "1M"     # 1 month
```

### Levels Contract

**Purpose**: Specifies order book depth for MarketDepth operations

```yaml
Levels:
  # Value type (positive integer)
  type: Integer
  constraints:
    minimum: 1
    maximum: 1000
  
  common_values: [5, 10, 20, 50, 100]
  
  laws:
    - "must be positive integer"
    - "represents number of price levels per side (bid/ask)"
    - "implementer may have maximum supported levels"
    - "higher levels may have performance implications"

examples:
  - 5      # Top 5 levels per side
  - 10     # Top 10 levels per side
  - 20     # Top 20 levels per side
```

### Side Contract

**Purpose**: Specifies trade aggressor side for Price data

```yaml
Side:
  # Simple enum type
  enum: ["BUY", "SELL"]
  descriptions:
    BUY: "Buy-side aggressor (trade hit the ask)"
    SELL: "Sell-side aggressor (trade hit the bid)"
  
  laws:
    - "must be valid Side enum value"
    - "indicates which side initiated the trade"
    - "maps to FIX Tag 54 (Side) values"

fix_compliance:
  tag: 54
  values:
    BUY: "1 (Buy)"
    SELL: "2 (Sell)"
```

## Market Data Context Management Operations

### Market Data Context Manager Interface

**Purpose**: Manage market data context lifecycle - creation, retrieval, updates, and validation of DataContext components.

```yaml
MarketDataContextManager:
  operations:
    createContext:
      signature: "Market → Exchange → Instrument → Result<DataContext>"
      behavior: "Create new market data context from components"
      laws:
        - "all components must be valid according to their contracts"
        - "returns MarketData with validated context"
        - "context must be internally consistent"
        - "idempotent: same inputs produce same context"
    
    getContext:
      signature: "ContextQuery → Result<List<DataContext>>"
      behavior: "Query existing contexts by criteria"
      laws:
        - "empty query returns all available contexts"
        - "specific query filters by matching criteria"
        - "results ordered by creation time (newest first)"
        - "returns empty list if no matches found"
    
    updateMarket:
      signature: "DataContext → Market → Result<DataContext>"
      behavior: "Update market component of existing context"
      laws:
        - "preserves exchange and instrument components"
        - "validates new market component"
        - "returns updated context with new market"
        - "original context remains unchanged"
    
    updateExchange:
      signature: "DataContext → Exchange → Result<DataContext>"
      behavior: "Update exchange component of existing context"
      laws:
        - "preserves market and instrument components"
        - "validates new exchange component"
        - "returns updated context with new exchange"
        - "original context remains unchanged"
    
    updateInstrument:
      signature: "DataContext → Instrument → Result<DataContext>"
      behavior: "Update instrument component of existing context"
      laws:
        - "preserves market and exchange components"
        - "validates new instrument component"
        - "returns updated context with new instrument"
        - "original context remains unchanged"
    
    validateContext:
      signature: "DataContext → Result<Void>"
      behavior: "Validate context consistency and component compatibility"
      laws:
        - "validates each component according to its contract"
        - "checks cross-component consistency"
        - "verifies market/exchange/instrument compatibility"
        - "returns success if all validations pass"

ContextQuery:
  # Query criteria for context retrieval
  marketType: MarketType | null    # Filter by market type
  exchangeId: String | null        # Filter by exchange ID
  assetClass: AssetClass | null    # Filter by asset class
  symbol: String | null            # Filter by instrument symbol
  region: String | null            # Filter by market region
  
laws:
  - "null fields are ignored in query (wildcard match)"
  - "non-null fields must match exactly"
  - "empty query (all nulls) matches all contexts"
  - "invalid enum values result in no matches"
```

## Market Data Reading Operations

### Core Reading Interface

The reading operations now work with the two-part structure: context input and structured data output.

```yaml
MarketDataReader:
  operations:
    getCurrentPrice:
      signature: "DataContext → Result<MarketData<Price>>"
      behavior: "Retrieve current/latest trade price for context"
      laws:
        - "returns MarketData with context and Price core data"
        - "context must be complete DataContext"
        - "failure if context not found or unavailable"
        - "Price data complies with FIX MDEntryType=2"
    
    getCurrentPrices:
      signature: "List<DataContext> → Result<List<MarketData<Price>>>"
      behavior: "Retrieve current prices for multiple contexts"
      laws:
        - "returns MarketData in same order as input contexts"
        - "missing contexts result in partial success or failure"
        - "empty input returns empty list"
        - "each Price complies with FIX protocol"
    
    getLevel1:
      signature: "DataContext → Result<MarketData<Level1>>"
      behavior: "Retrieve current top-of-book quote"
      laws:
        - "returns MarketData with context and Level1 core data"
        - "Level1 must represent current best bid/ask"
        - "quote must be current (not stale)"
        - "Level1 complies with FIX MDEntryType=0/1"
    
    getMarketDepth:
      signature: "DataContext → Levels → Result<MarketData<MarketDepth>>"
      behavior: "Retrieve multi-level order book"
      laws:
        - "returns MarketData with context and MarketDepth"
        - "levels parameter specifies depth (5, 10, 20, etc.)"
        - "MarketDepth complies with FIX multi-level protocol"
        - "failure if depth not supported"
    
    getOHLCV:
      signature: "DataContext → Timeframe → Result<MarketData<OHLCV>>"
      behavior: "Retrieve OHLCV data for timeframe"
      laws:
        - "returns MarketData with context and OHLCV core data"
        - "timeframe must be valid (1m, 5m, 1h, 1d, etc.)"
        - "returns most recent complete bar"
        - "OHLCV derived from FIX trade aggregations"
    
    getPriceHistory:
      signature: "DataContext → DateRange → Result<List<MarketData<Price>>>"
      behavior: "Retrieve historical trade/price data"
      laws:
        - "returns MarketData list in chronological order"
        - "dateRange must be valid (start <= end)"
        - "respects data availability limits"
        - "each Price complies with FIX MDEntryType=2"
    
    getLevel1History:
      signature: "DataContext → DateRange → Result<List<MarketData<Level1>>>"
      behavior: "Retrieve historical Level1 quote data"
      laws:
        - "returns MarketData list in chronological order"
        - "dateRange must be valid (start <= end)"
        - "respects data availability limits"
        - "each Level1 complies with FIX MDEntryType=0/1"
    
    getOHLCVHistory:
      signature: "DataContext → Timeframe → DateRange → Result<List<MarketData<OHLCV>>>"
      behavior: "Retrieve historical OHLCV data"
      laws:
        - "returns MarketData list in chronological order"
        - "dateRange must be valid (start <= end)"
        - "respects data availability limits"
        - "each OHLCV complies with aggregation standards"
    
    getMarketAnalytics:
      signature: "Market → Result<MarketData<MarketAnalytics>>"
      behavior: "Retrieve market-wide analytics"
      laws:
        - "returns MarketData with market context and analytics"
        - "Market parameter specifies which market (CRYPTO, EQUITY, etc.)"
        - "analytics derived from underlying FIX data"
        - "failure if market analytics unavailable"

universal_laws:
  - "all operations return Result<MarketData<T>> for error handling"
  - "context parameters provide complete identification"
  - "core data always complies with FIX Protocol where applicable"
  - "implementer decides data source routing based on context"
  - "context separation maintained throughout"
```

### Historical Data Reading Interface

```yaml
HistoricalMarketDataReader:
  operations:
    getPriceHistory:
      signature: "DataContext → DateRange → Result<List<MarketData<Price>>>"
      behavior: "Retrieve historical trade/price data for date range"
      laws:
        - "returns chronologically ordered MarketData<Price> list"
        - "dateRange.startDate <= dateRange.endDate"
        - "respects data provider availability limits"
        - "each Price complies with FIX MDEntryType=2"
        - "empty result if no data available for range"
    
    getLevel1History:
      signature: "DataContext → DateRange → Result<List<MarketData<Level1>>>"
      behavior: "Retrieve historical Level1 quote data for date range"
      laws:
        - "returns chronologically ordered MarketData<Level1> list"
        - "dateRange.startDate <= dateRange.endDate"
        - "respects data provider availability limits"
        - "each Level1 complies with FIX MDEntryType=0/1"
        - "empty result if no data available for range"
    
    getOHLCVHistory:
      signature: "DataContext → Timeframe → DateRange → Result<List<MarketData<OHLCV>>>"
      behavior: "Retrieve historical OHLCV data for timeframe and date range"
      laws:
        - "returns chronologically ordered MarketData<OHLCV> list"
        - "timeframe must be valid (1m, 5m, 1h, 1d, etc.)"
        - "dateRange.startDate <= dateRange.endDate"
        - "respects data provider availability limits"
        - "each OHLCV complies with FIX-derived aggregation standards"
        - "bars aligned to timeframe boundaries"
    
    getMarketDepthHistory:
      signature: "DataContext → Levels → DateRange → Result<List<MarketData<MarketDepth>>>"
      behavior: "Retrieve historical order book depth snapshots"
      laws:
        - "returns chronologically ordered MarketData<MarketDepth> list"
        - "levels parameter specifies depth (5, 10, 20, etc.)"
        - "dateRange.startDate <= dateRange.endDate"
        - "respects data provider availability limits"
        - "each MarketDepth complies with FIX multi-level protocol"
        - "snapshots may be sparse based on data availability"

universal_laws:
  - "all operations return Result<List<MarketData<T>>> for error handling"
  - "chronological ordering maintained across all historical operations"
  - "dateRange validation performed before data retrieval"
  - "partial results possible if data partially available"
  - "implementer determines historical data source routing"
```

### Real-time Streaming Interface

```yaml
StreamingMarketDataReader:
  operations:
    subscribePriceStream:
      signature: "DataContext → (MarketData<Price> → Void) → Result<Subscription>"
      behavior: "Subscribe to real-time price updates with callback"
      laws:
        - "callback invoked for each new Price update"
        - "Price data complies with FIX MDEntryType=2"
        - "subscription remains active until cancelled"
        - "context determines streaming source routing"
        - "callback execution must not block stream processing"
    
    subscribeLevel1Stream:
      signature: "DataContext → (MarketData<Level1> → Void) → Result<Subscription>"
      behavior: "Subscribe to real-time Level1 quote updates"
      laws:
        - "callback invoked for each new Level1 update"
        - "Level1 data complies with FIX MDEntryType=0/1"
        - "subscription remains active until cancelled"
        - "context determines streaming source routing"
        - "callback execution must not block stream processing"
    
    subscribeMarketDepthStream:
      signature: "DataContext → Levels → (MarketData<MarketDepth> → Void) → Result<Subscription>"
      behavior: "Subscribe to real-time order book depth updates"
      laws:
        - "callback invoked for each new MarketDepth update"
        - "levels parameter specifies depth (5, 10, 20, etc.)"
        - "MarketDepth complies with FIX multi-level protocol"
        - "subscription remains active until cancelled"
        - "callback execution must not block stream processing"
    
    subscribeOHLCVStream:
      signature: "DataContext → Timeframe → (MarketData<OHLCV> → Void) → Result<Subscription>"
      behavior: "Subscribe to real-time OHLCV bar updates"
      laws:
        - "callback invoked for each completed OHLCV bar"
        - "timeframe must be valid (1m, 5m, 1h, 1d, etc.)"
        - "OHLCV complies with FIX-derived aggregation standards"
        - "subscription remains active until cancelled"
        - "bars delivered at timeframe completion"
    
    unsubscribe:
      signature: "Subscription → Result<Void>"
      behavior: "Cancel active subscription"
      laws:
        - "stops further callback invocations"
        - "idempotent: multiple unsubscribe calls safe"
        - "subscription resources cleaned up"
        - "returns success even if already unsubscribed"

Subscription:
  # Opaque subscription handle
  fields:
    id: String              # Unique subscription identifier
    context: DataContext    # Associated data context
    isActive: Boolean       # Current subscription state
  
  laws:
    - "id must be unique across all active subscriptions"
    - "context matches original subscription context"
    - "isActive reflects current subscription state"

universal_laws:
  - "all operations return Result<T> for error handling"
  - "callbacks must be non-blocking to maintain stream performance"
  - "subscription lifecycle managed by implementer"
  - "context determines streaming source and routing"
  - "implementer ensures stream reliability and reconnection"
```

## Market Data Writing Operations

### Core Writing Interface

The writing operations now work with the complete MarketData structure including context.

```yaml
MarketDataWriter:
  operations:
    writePrice:
      signature: "MarketData<Price> → Result<Void>"
      behavior: "Write single price data point with context"
      laws:
        - "MarketData must contain valid context and Price data"
        - "Price data must comply with FIX MDEntryType=2"
        - "context determines routing to appropriate destination"
        - "idempotent: same price can be written multiple times"
    
    writePrices:
      signature: "List<MarketData<Price>> → Result<Void>"
      behavior: "Write multiple price data points"
      laws:
        - "all MarketData must have valid context and Price data"
        - "each Price must comply with FIX protocol"
        - "atomic: either all succeed or all fail"
        - "context used for routing each price appropriately"
    
    writeLevel1:
      signature: "MarketData<Level1> → Result<Void>"
      behavior: "Write Level1 quote data with context"
      laws:
        - "MarketData must contain valid context and Level1 data"
        - "Level1 must comply with FIX MDEntryType=0/1"
        - "updates existing quote for same context"
        - "context determines target market/exchange"
    
    writeMarketDepth:
      signature: "MarketData<MarketDepth> → Result<Void>"
      behavior: "Write order book depth data"
      laws:
        - "MarketData must contain valid context and MarketDepth"
        - "MarketDepth must comply with FIX multi-level protocol"
        - "replaces existing depth for same context"
        - "context determines book routing"
    
    writeOHLCV:
      signature: "MarketData<OHLCV> → Result<Void>"
      behavior: "Write OHLCV bar data with context"
      laws:
        - "MarketData must contain valid context and OHLCV data"
        - "OHLCV must comply with FIX-derived aggregation standards"
        - "updates existing bar for same context and timestamp"
        - "context determines time series routing"
    
    writeOHLCVBatch:
      signature: "List<MarketData<OHLCV>> → Result<Void>"
      behavior: "Write multiple OHLCV bars"
      laws:
        - "all MarketData must have valid context and OHLCV data"
        - "each OHLCV must comply with aggregation standards"
        - "atomic: either all succeed or all fail"
        - "maintains chronological order within same context"
    
    writeAnalytics:
      signature: "MarketData<MarketAnalytics> → Result<Void>"
      behavior: "Write market analytics data"
      laws:
        - "MarketData must contain market context and analytics"
        - "analytics derived from underlying FIX data"
        - "updates current analytics state for market"
        - "context determines analytics scope and routing"

universal_laws:
  - "all operations return Result<Void> for error handling"
  - "data validation performed on both context and core data"
  - "context determines target routing and formatting"
  - "core data must comply with FIX Protocol where applicable"
  - "implementer uses context for destination selection"
```

### Historical Data Writing Interface

```yaml
HistoricalMarketDataWriter:
  operations:
    writePriceHistory:
      signature: "List<MarketData<Price>> → Result<Void>"
      behavior: "Write historical trade/price data with chronological ordering"
      laws:
        - "all MarketData must have valid context and Price data"
        - "list must be chronologically ordered"
        - "respects data destination capacity limits"
        - "each Price complies with FIX MDEntryType=2"
        - "atomic: either all succeed or all fail"
    
    writeLevel1History:
      signature: "List<MarketData<Level1>> → Result<Void>"
      behavior: "Write historical Level1 quote data with chronological ordering"
      laws:
        - "all MarketData must have valid context and Level1 data"
        - "list must be chronologically ordered"
        - "respects data destination capacity limits"
        - "each Level1 complies with FIX MDEntryType=0/1"
        - "atomic: either all succeed or all fail"
    
    writeOHLCVHistory:
      signature: "List<MarketData<OHLCV>> → Result<Void>"
      behavior: "Write historical OHLCV data with chronological ordering"
      laws:
        - "all MarketData must have valid context and OHLCV data"
        - "list must be chronologically ordered"
        - "respects data destination capacity limits"
        - "each OHLCV complies with FIX-derived aggregation standards"
        - "bars must be aligned to timeframe boundaries"
        - "atomic: either all succeed or all fail"
    
    writeMarketDepthHistory:
      signature: "List<MarketData<MarketDepth>> → Result<Void>"
      behavior: "Write historical order book depth snapshots"
      laws:
        - "all MarketData must have valid context and MarketDepth data"
        - "list must be chronologically ordered"
        - "respects data destination capacity limits"
        - "each MarketDepth complies with FIX multi-level protocol"
        - "atomic: either all succeed or all fail"

universal_laws:
  - "all operations return Result<Void> for error handling"
  - "chronological ordering must be maintained across all historical operations"
  - "data validation performed on both context and core data"
  - "implementer determines historical data destination routing"
  - "batch operations are atomic (all succeed or all fail)"
```

### Real-time Streaming Writing Interface

```yaml
StreamingMarketDataWriter:
  operations:
    startPriceStream:
      signature: "DataContext → Result<PriceStream>"
      behavior: "Start a real-time price writing stream"
      laws:
        - "returns PriceStream handle for writing Price data"
        - "context determines streaming destination routing"
        - "stream remains active until stopped"
        - "multiple concurrent streams supported per context"
    
    startLevel1Stream:
      signature: "DataContext → Result<Level1Stream>"
      behavior: "Start a real-time Level1 quote writing stream"
      laws:
        - "returns Level1Stream handle for writing Level1 data"
        - "context determines streaming destination routing"
        - "stream remains active until stopped"
        - "replaces existing Level1 quotes for same context"
    
    startMarketDepthStream:
      signature: "DataContext → Levels → Result<MarketDepthStream>"
      behavior: "Start a real-time order book depth writing stream"
      laws:
        - "returns MarketDepthStream handle for writing MarketDepth"
        - "levels parameter specifies depth (5, 10, 20, etc.)"
        - "context determines streaming destination routing"
        - "stream remains active until stopped"
    
    startOHLCVStream:
      signature: "DataContext → Timeframe → Result<OHLCVStream>"
      behavior: "Start a real-time OHLCV bar writing stream"
      laws:
        - "returns OHLCVStream handle for writing OHLCV data"
        - "timeframe must be valid (1m, 5m, 1h, 1d, etc.)"
        - "context determines streaming destination routing"
        - "stream remains active until stopped"
        - "bars written at timeframe completion"

PriceStream:
  operations:
    write:
      signature: "Price → Result<Void>"
      behavior: "Write Price data to active stream"
      laws:
        - "Price must comply with FIX MDEntryType=2"
        - "context attached automatically from stream"
        - "non-blocking operation for high throughput"
    
    stop:
      signature: "Void → Result<Void>"
      behavior: "Stop the price stream"
      laws:
        - "closes stream and releases resources"
        - "idempotent: multiple stop calls safe"

Level1Stream:
  operations:
    write:
      signature: "Level1 → Result<Void>"
      behavior: "Write Level1 data to active stream"
      laws:
        - "Level1 must comply with FIX MDEntryType=0/1"
        - "context attached automatically from stream"
        - "updates existing quote for stream context"
    
    stop:
      signature: "Void → Result<Void>"
      behavior: "Stop the Level1 stream"
      laws:
        - "closes stream and releases resources"
        - "idempotent: multiple stop calls safe"

MarketDepthStream:
  operations:
    write:
      signature: "MarketDepth → Result<Void>"
      behavior: "Write MarketDepth data to active stream"
      laws:
        - "MarketDepth must comply with FIX multi-level protocol"
        - "context attached automatically from stream"
        - "replaces existing depth for stream context"
    
    stop:
      signature: "Void → Result<Void>"
      behavior: "Stop the MarketDepth stream"
      laws:
        - "closes stream and releases resources"
        - "idempotent: multiple stop calls safe"

OHLCVStream:
  operations:
    write:
      signature: "OHLCV → Result<Void>"
      behavior: "Write OHLCV data to active stream"
      laws:
        - "OHLCV must comply with FIX-derived aggregation standards"
        - "context attached automatically from stream"
        - "updates existing bar for stream context and timestamp"
    
    stop:
      signature: "Void → Result<Void>"
      behavior: "Stop the OHLCV stream"
      laws:
        - "closes stream and releases resources"
        - "idempotent: multiple stop calls safe"

universal_laws:
  - "all operations return Result<T> for error handling"
  - "stream operations designed for high-throughput scenarios"
  - "context automatically attached from stream configuration"
  - "stream lifecycle managed by implementer"
  - "implementer ensures stream reliability and buffering"
```

## Universal DSL Laws

### Type Safety Laws

```yaml
type_safety:
  data_integrity:
    - "all numeric fields must be finite (not NaN or Infinity)"
    - "all timestamp fields must be valid ISO 8601"
    - "all string fields must be non-empty where required"
    - "all size/volume fields must be positive"
  
  operation_safety:
    - "read operations never modify state"
    - "write operations are side-effect operations"
    - "all operations return Result<T> for error handling"
    - "no exceptions thrown in normal operation"
```

### Composition Laws

```yaml
composition:
  reader_writer_compatibility:
    - "output type of read operation must match input type of write operation"
    - "Price reader output → Price writer input (valid)"
    - "Level1 reader output → Level1 writer input (valid)"
    - "Price reader output → Level1 writer input (invalid)"
  
  data_flow:
    - "data flows unidirectionally: Read → Transform → Write"
    - "original data immutable during transformation"
    - "transformations must preserve data contracts"
```

### Error Handling Laws

```yaml
error_handling:
  failure_conditions:
    - "invalid symbol format → VALIDATION error"
    - "symbol not found → NOT_FOUND error"
    - "network timeout → TIMEOUT error"
    - "invalid data format → PARSING error"
    - "permission denied → SECURITY error"
  
  error_propagation:
    - "read errors propagate to composition result"
    - "write errors propagate to composition result"
    - "partial failures in batch operations → appropriate error"
```

## Context and Implementation Responsibility

### What DSL Does NOT Define

The DSL intentionally does not specify:

```yaml
out_of_scope:
  context_management:
    - "exchange identification or routing"
    - "market identification or classification" 
    - "symbol format or interpretation"
    - "ticker normalization across sources"
  
  implementation_details:
    - "authentication mechanisms"
    - "rate limiting strategies"
    - "caching policies"
    - "retry logic"
    - "connection management"
  
  business_logic:
    - "price validation rules"
    - "market hours enforcement"
    - "data source selection"
    - "error recovery strategies"
```

### Implementation Responsibility

Each implementation decides:

```yaml
implementer_decisions:
  symbol_interpretation:
    - "BTC → bitcoin (CoinGecko mapping)"
    - "AAPL → Apple Inc (stock symbol)"
    - "BTC-USD → Bitcoin/USD pair (exchange format)"
  
  routing_strategy:
    - "symbol → data source mapping"
    - "exchange preference order"
    - "fallback source selection"
    - "multi-source aggregation"
  
  context_handling:
    - "authentication per source"
    - "rate limiting per endpoint"
    - "error handling per source type"
    - "retry policies per operation"
```

## Standards Compliance

### Financial Industry Standards

```yaml
fix_protocol_4_4:
  trade_data: "MDEntryType=2 (Trade) → Price contract"
  quote_data: "MDEntryType=0/1 (Bid/Offer) → Level1 contract"
  field_mapping:
    - "MDEntryTime (273) → timestamp"
    - "MDEntryPrice (270) → price/bid/ask"
    - "MDEntrySize (271) → size/quantity"

time_series_standards:
  ohlcv_aggregation: "Industry standard bar construction"
  timestamp_alignment: "Bar start time representation"
  volume_calculation: "Period total volume aggregation"
  
precision_standards:
  price_precision: "8 decimal places for price values"
  volume_precision: "Arbitrary precision for volume/size"
  timestamp_precision: "Millisecond resolution minimum"
```

## Usage Patterns

### Context Creation

```
// Language-agnostic context creation patterns

// Bitcoin on Coinbase
btcCoinbaseContext = DataContext{
  market: Market{type: CRYPTO, region: "GLOBAL", segment: "CASH"},
  exchange: Exchange{id: "COINBASE", name: "Coinbase Pro", mic: null, timezone: "UTC"},
  instrument: Instrument{symbol: "BTC-USD", name: "Bitcoin", assetClass: CRYPTO, currency: "USD"}
}

// Apple stock on NYSE
aaplNyseContext = DataContext{
  market: Market{type: EQUITY, region: "US", segment: "CASH"},
  exchange: Exchange{id: "NYSE", name: "New York Stock Exchange", mic: "XNYS", timezone: "America/New_York"},
  instrument: Instrument{symbol: "AAPL", isin: "US0378331005", name: "Apple Inc.", assetClass: STOCK, currency: "USD"}
}
```

### Basic Read Operations

```
// Language-agnostic pseudocode patterns
reader = createMarketDataReader(config)

// Single operations with context
priceResult = getCurrentPrice(btcCoinbaseContext, reader)
level1Result = getLevel1(aaplNyseContext, reader)
ohlcvResult = getOHLCV(btcCoinbaseContext, "1h", reader)

// Batch operations with multiple contexts
contexts = [btcCoinbaseContext, aaplNyseContext]
pricesResult = getCurrentPrices(contexts, reader)

// Extract data with context preserved
if isSuccess(priceResult) then
  marketData = getData(priceResult)
  context = marketData.context
  price = marketData.coreData
  
  // Context provides routing information
  exchange = context.exchange.id
  symbol = context.instrument.symbol
  priceValue = price.price
  
  processPrice(exchange, symbol, priceValue)
else
  error = getError(priceResult)
  handleError(error)
end
```

### Basic Write Operations

```
// Language-agnostic pseudocode patterns
writer = createMarketDataWriter(config)

// Create market data with context and core data
priceData = Price{
  timestamp: currentTime(),
  price: 45000.50,
  size: 1.5,
  tradeId: "TXN123456"
}

marketData = MarketData{
  context: btcCoinbaseContext,
  coreData: priceData
}

// Publish with full context
writeResult = writePrice(marketData, writer)

// Batch operations
marketDataArray = [marketData1, marketData2, marketData3]
writeResult = writePrices(marketDataArray, writer)

// Error handling
if isFailure(writeResult) then
  error = getError(writeResult)
  retryOrLog(error)
end
```

### Context-Aware Composition

```
// Language-agnostic composition with context preservation
readerResult = getCurrentPrices(contexts, reader)
if isSuccess(readerResult) then
  marketDataList = getData(readerResult)
  
  // Transform core data while preserving context
  transformedMarketData = marketDataList.map(md => 
    MarketData{
      context: md.context,  // Context preserved
      coreData: transformPrice(md.coreData)  // Core data transformed
    }
  )
  
  writeResult = writePrices(transformedMarketData, writer)
  
  if isFailure(writeResult) then
    handleWriteError(getError(writeResult))
  end
else
  handleReadError(getError(readerResult))
end
```

### FIX Protocol Compliance Example

```
// Creating FIX-compliant market data
fixPrice = Price{
  timestamp: "2024-01-15T14:30:00.123Z",  // FIX Tag 273 (MDEntryTime)
  price: 45123.45,                        // FIX Tag 270 (MDEntryPrice)
  size: 2.5,                             // FIX Tag 271 (MDEntrySize)
  tradeId: "NYSE123456789",              // FIX Tag 1003 (TradeID)
  aggressor: BUY                         // FIX Tag 54 (Side)
}

fixLevel1 = Level1{
  timestamp: "2024-01-15T14:30:00.123Z", // FIX Tag 273 (MDEntryTime)
  bidPrice: 45123.00,                    // FIX Tag 270 + MDEntryType=0
  bidSize: 5.0,                         // FIX Tag 271 + MDEntryType=0
  askPrice: 45123.50,                   // FIX Tag 270 + MDEntryType=1
  askSize: 3.0,                         // FIX Tag 271 + MDEntryType=1
  quoteId: "QUOTE789"                   // FIX Tag 117 (QuoteID)
}

// Both comply with FIX Protocol 4.4 specifications
```

## Contract Verification

### Data Contract Tests

```yaml
price_contract_tests:
  - "Price with valid timestamp, positive value, positive size → valid"
  - "Price with negative value → invalid"
  - "Price with zero size → invalid"
  - "Price with invalid timestamp → invalid"

level1_contract_tests:
  - "Level1 with askPrice >= bidPrice → valid"
  - "Level1 with askPrice < bidPrice → invalid (crossed market)"
  - "Level1 with negative sizes → invalid"

ohlcv_contract_tests:
  - "OHLCV with low <= high, open/close within range → valid"
  - "OHLCV with low > high → invalid"
  - "OHLCV with negative volume → invalid"
```

### Operation Contract Tests

```yaml
read_operation_tests:
  - "getCurrentPrice with valid context → Result<MarketData<Price>>"
  - "getCurrentPrice with invalid context → Result<Error>"
  - "getCurrentPrices with empty list → Result<[]>"
  - "getLevel1 with valid context → Result<MarketData<Level1>>"
  - "getPriceHistory with valid range → Result<List<MarketData<Price>>>"
  - "getLevel1History with invalid range → Result<Error>"

write_operation_tests:
  - "writePrice with valid MarketData<Price> → Result<Success>"
  - "writePrice with invalid Price data → Result<Error>"
  - "writePrices with valid array → Result<Success>"
  - "writePrices with partial invalid → Result<Error>"

streaming_operation_tests:
  - "subscribePriceStream with valid context → Result<Subscription>"
  - "unsubscribe with valid subscription → Result<Success>"
  - "startPriceStream with valid context → Result<PriceStream>"
  - "PriceStream.write with valid Price → Result<Success>"

support_type_tests:
  - "DateRange with start > end → invalid"
  - "Timeframe with invalid format → invalid"
  - "Levels with negative value → invalid"
  - "AssetClass with unknown value → invalid"
```

---

**DSL Contract Compliance**: Any implementation claiming @qi/dp DSL compatibility must implement ALL market data types and operations exactly as specified, while maintaining complete freedom in context management, routing, and business logic implementation.
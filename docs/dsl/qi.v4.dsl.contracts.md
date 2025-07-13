# QiCore v4.0 Market Data DSL Specification

This document defines pure market data contracts for reading and writing financial market data. The DSL is completely language-agnostic and focuses solely on data structures and operations, independent of any specific readers, writers, or data sources.

**Dependencies**: This specification builds on [QiCore v4.0 Foundation](../../qi-v2-qicore/docs/contracts/) for error handling and infrastructure services.

## Core Principle

> **The DSL defines the vocabulary (data types) and grammar (operations) of market data. Context, routing, and behavior are the responsibility of implementers.**

## Foundation Dependencies

### qi/base Usage (Required)

All DSL operations must use QiCore Foundation's error handling:

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
  - "publishPrice: MarketData<Price> → Result<Void>"
  - "getMarketAnalytics: Market → Result<MarketData<MarketAnalytics>>"
```

### qi/core Usage (Optional)

DSL implementations MAY use QiCore Foundation infrastructure services:

```yaml
optional_infrastructure:
  configuration:
    purpose: "Configure data sources, API keys, rate limits"
    usage: "Reader/Writer initialization and settings"
    example: "CoinGeckoConfig loaded from config service"
  
  logging:
    purpose: "Structured logging of market data operations"
    usage: "Operation tracing, error diagnostics, performance monitoring"
    context: "Include symbol, exchange, operation type in log context"
  
  caching:
    purpose: "Cache market data for performance optimization"
    usage: "Price caching, rate limiting, expensive operations"
    ttl: "Respect market data freshness requirements"

implementation_freedom:
  - "DSL implementations can choose their own infrastructure"
  - "qi/core usage is optional, not required by contracts"
  - "Foundation qi/base Result<T> usage is mandatory"
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

```yaml
Market:
  type: MarketType         # EQUITY, CRYPTO, FOREX, COMMODITY, BOND
  region: String           # Geographic region (US, EU, ASIA, GLOBAL)
  segment: String          # Market segment (CASH, FUTURES, OPTIONS)
  
laws:
  - "type must be valid MarketType enum"
  - "region must be ISO country code or GLOBAL"
  - "segment describes trading mechanism"

MarketType:
  - EQUITY     # Stock markets
  - CRYPTO     # Cryptocurrency markets  
  - FOREX      # Foreign exchange
  - COMMODITY  # Commodities and raw materials
  - BOND       # Fixed income securities
  - DERIVATIVE # Futures, options, swaps
```

### Exchange Contract

```yaml
Exchange:
  id: String              # Unique exchange identifier
  name: String            # Human-readable exchange name
  mic: String             # ISO 10383 Market Identifier Code
  timezone: String        # Exchange timezone (IANA)
  
laws:
  - "id must be unique across all exchanges"
  - "mic must be valid ISO 10383 code where applicable"
  - "timezone must be valid IANA timezone"
  
examples:
  - {id: "NYSE", name: "New York Stock Exchange", mic: "XNYS", timezone: "America/New_York"}
  - {id: "BINANCE", name: "Binance", mic: null, timezone: "UTC"}
  - {id: "COINBASE", name: "Coinbase Pro", mic: null, timezone: "America/New_York"}
```

### Instrument Contract

```yaml
Instrument:
  symbol: String          # Exchange-specific symbol
  isin: String           # International Securities Identification Number (optional)
  name: String           # Human-readable instrument name
  assetClass: AssetClass # Classification of the underlying asset
  currency: String       # Base currency (ISO 4217)
  
laws:
  - "symbol must be non-empty"
  - "currency must be valid ISO 4217 code"
  - "isin must be valid format when provided"

AssetClass:
  - STOCK      # Equity shares
  - CRYPTO     # Cryptocurrency tokens
  - CURRENCY   # Fiat currencies
  - COMMODITY  # Physical commodities
  - BOND       # Fixed income securities
  - INDEX      # Market indices
```

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

## Market Data Writing Operations

### Core Writing Interface

The writing operations now work with the complete MarketData structure including context.

```yaml
MarketDataWriter:
  operations:
    publishPrice:
      signature: "MarketData<Price> → Result<Void>"
      behavior: "Publish single price data point with context"
      laws:
        - "MarketData must contain valid context and Price data"
        - "Price data must comply with FIX MDEntryType=2"
        - "context determines routing to appropriate destination"
        - "idempotent: same price can be published multiple times"
    
    publishPrices:
      signature: "List<MarketData<Price>> → Result<Void>"
      behavior: "Publish multiple price data points"
      laws:
        - "all MarketData must have valid context and Price data"
        - "each Price must comply with FIX protocol"
        - "atomic: either all succeed or all fail"
        - "context used for routing each price appropriately"
    
    publishLevel1:
      signature: "MarketData<Level1> → Result<Void>"
      behavior: "Publish Level1 quote data with context"
      laws:
        - "MarketData must contain valid context and Level1 data"
        - "Level1 must comply with FIX MDEntryType=0/1"
        - "updates existing quote for same context"
        - "context determines target market/exchange"
    
    publishMarketDepth:
      signature: "MarketData<MarketDepth> → Result<Void>"
      behavior: "Publish order book depth data"
      laws:
        - "MarketData must contain valid context and MarketDepth"
        - "MarketDepth must comply with FIX multi-level protocol"
        - "replaces existing depth for same context"
        - "context determines book routing"
    
    publishOHLCV:
      signature: "MarketData<OHLCV> → Result<Void>"
      behavior: "Publish OHLCV bar data with context"
      laws:
        - "MarketData must contain valid context and OHLCV data"
        - "OHLCV must comply with FIX-derived aggregation standards"
        - "updates existing bar for same context and timestamp"
        - "context determines time series routing"
    
    publishOHLCVBatch:
      signature: "List<MarketData<OHLCV>> → Result<Void>"
      behavior: "Publish multiple OHLCV bars"
      laws:
        - "all MarketData must have valid context and OHLCV data"
        - "each OHLCV must comply with aggregation standards"
        - "atomic: either all succeed or all fail"
        - "maintains chronological order within same context"
    
    publishAnalytics:
      signature: "MarketData<MarketAnalytics> → Result<Void>"
      behavior: "Publish market analytics data"
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
publishResult = publishPrice(marketData, writer)

// Batch operations
marketDataArray = [marketData1, marketData2, marketData3]
publishResult = publishPrices(marketDataArray, writer)

// Error handling
if isFailure(publishResult) then
  error = getError(publishResult)
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
  
  publishResult = publishPrices(transformedMarketData, writer)
  
  if isFailure(publishResult) then
    handleWriteError(getError(publishResult))
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
  - "getCurrentPrice with valid symbol → Result<Price>"
  - "getCurrentPrice with invalid symbol → Result<Error>"
  - "getCurrentPrices with empty list → Result<[]>"
  - "getLevel1 with valid symbol → Result<Level1>"

write_operation_tests:
  - "publishPrice with valid Price → Result<Success>"
  - "publishPrice with invalid Price → Result<Error>"
  - "publishPrices with valid array → Result<Success>"
  - "publishPrices with partial invalid → Result<Error>"
```

---

**DSL Contract Compliance**: Any implementation claiming QiCore v4.0 DSL compatibility must implement ALL market data types and operations exactly as specified, while maintaining complete freedom in context management, routing, and business logic implementation.
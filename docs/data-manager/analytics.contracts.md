# @qi/dp Market Data Analytics Specification

This document defines analytics contracts for computing derived metrics and statistics from market data. The analytics layer operates **on top of** the DSL market data contracts and provides business intelligence for market analysis.

**Dependencies**: This specification builds on `@qi/base`, `@qi/core`, and `@qi/dp/dsl` for foundational types and market data.

## Core Principle

> **Analytics transform raw market data into business intelligence. They aggregate, compute, and derive insights from DSL market data types.**

## Foundation Dependencies

### @qi/base Usage (Required)

All analytics operations must use foundation error handling:

```yaml
foundation_error_handling:
  all_operations_return: "Result<T> where T is the expected analytics type"
  error_propagation: "QiError with appropriate ErrorCategory"
  composition: "Result<T> enables functional composition of analytics operations"
  
error_categories_used:
  VALIDATION: "Invalid timeframe, malformed parameters"
  NOT_FOUND: "Insufficient data for calculation"
  NETWORK: "Data source unavailable"
  COMPUTATION: "Mathematical calculation errors, division by zero"
  TIMEOUT: "Analytics calculation time limit exceeded"

example_signatures:
  - "calculateMarketAnalytics: Market → DateRange → Result<MarketAnalytics>"
  - "computeVolatility: List<MarketData<Price>> → Result<VolatilityMetrics>"
  - "aggregateMarketCap: List<MarketData<Price>> → Result<Decimal>"
```

### @qi/core Usage (Required)

Analytics implementations MUST use foundation infrastructure modules:

```yaml
required_infrastructure:
  configuration:
    purpose: "Configure analytics parameters, calculation windows, thresholds"
    usage: "Analytics service initialization and settings"
    example: "AnalyticsConfig with calculation intervals and precision settings"
    module: "@qi/core/config"
  
  logging:
    purpose: "Structured logging of analytics calculations and performance"
    usage: "Calculation tracing, error diagnostics, performance monitoring"
    context: "Include timeframe, market, calculation type in log context"
    module: "@qi/core/logger"
  
  caching:
    purpose: "Cache computed analytics for performance optimization"
    usage: "Analytics caching, expensive calculation memoization"
    ttl: "Respect analytics freshness requirements"
    module: "@qi/core/cache"

mandatory_modules:
  - "@qi/core/config - Analytics configuration management and validation"
  - "@qi/core/logger - Structured logging with analytics context"
  - "@qi/core/cache - Caching layer for computed analytics"
  - "@qi/base/result - Error handling with Result<T> (foundation requirement)"
```

### @qi/dp/dsl Usage (Required)

Analytics layer depends on DSL market data types:

```yaml
dsl_dependencies:
  input_types:
    - "MarketData<Price> - Trade data for calculations"
    - "MarketData<Level1> - Quote data for spread analysis"
    - "MarketData<OHLCV> - Time series data for volatility"
    - "MarketData<MarketDepth> - Order book data for depth analysis"
    - "DataContext - Market/Exchange/Instrument identification"
  
  foundation_types:
    - "Market - Market classification for analytics scope"
    - "DateRange - Time period specification for analytics"
    - "Timeframe - Time interval for aggregated analytics"
    - "Result<T> - Error handling from DSL operations"

usage_pattern:
  data_flow: "DSL Reader → Market Data → Analytics Processor → Analytics Results"
  composition: "Analytics consumes DSL outputs and produces derived insights"
  separation: "Analytics layer operates on top of DSL, not within it"
```

## Market Analytics Data Types

### MarketAnalytics Contract

**Purpose**: Aggregate market statistics and derived metrics for a specific market

```yaml
MarketAnalytics:
  # Core analytics fields
  timestamp: DateTime           # When analytics were calculated
  market: Market               # Market scope (from DSL)
  calculationPeriod: DateRange # Time period for analytics calculation
  
  # Market aggregates
  totalMarketCap: Decimal      # Total market capitalization
  totalVolume: Decimal         # Total trading volume for period
  instrumentCount: Integer     # Number of active instruments
  activeExchangeCount: Integer # Number of exchanges with activity
  
  # Derived metrics
  dominanceMetrics: DominanceMetrics    # Market share percentages
  changeMetrics: ChangeMetrics          # Period-over-period changes
  volatilityMetrics: VolatilityMetrics  # Market volatility measures
  liquidityMetrics: LiquidityMetrics    # Market liquidity indicators
  
laws:
  - "timestamp must be valid ISO 8601 datetime"
  - "market must be valid Market from DSL"
  - "calculationPeriod must be valid DateRange"
  - "totalMarketCap must be positive decimal number"
  - "totalVolume must be positive decimal number"  
  - "instrumentCount must be positive integer"
  - "activeExchangeCount must be positive integer"
  - "all percentage values must be between -100 and 100"
  - "all metrics must be computed from underlying DSL data"

data_sources:
  required_inputs:
    - "List<MarketData<Price>> - Trade data for market cap and volume"
    - "List<MarketData<Level1>> - Quote data for spread analysis"
    - "List<MarketData<OHLCV>> - Time series for volatility calculations"
  optional_inputs:
    - "List<MarketData<MarketDepth>> - Order book for liquidity analysis"
```

### Support Analytics Types

```yaml
DominanceMetrics:
  # Market dominance percentages
  topInstrumentShare: Decimal      # Largest instrument market share (%)
  top5InstrumentShare: Decimal     # Top 5 instruments market share (%)
  top10InstrumentShare: Decimal    # Top 10 instruments market share (%)
  exchangeConcentration: Decimal   # Herfindahl index for exchange concentration
  
  laws:
    - "all percentages between 0 and 100"
    - "topInstrumentShare <= top5InstrumentShare <= top10InstrumentShare"
    - "exchangeConcentration between 0 and 1 (normalized Herfindahl)"

ChangeMetrics:
  # Period-over-period percentage changes
  change1h: Decimal             # 1-hour percentage change
  change24h: Decimal            # 24-hour percentage change  
  change7d: Decimal             # 7-day percentage change
  change30d: Decimal            # 30-day percentage change
  changeYTD: Decimal            # Year-to-date percentage change
  
  laws:
    - "all changes expressed as percentages"
    - "negative values indicate decreases"
    - "positive values indicate increases"
    - "calculation based on period start vs period end values"

VolatilityMetrics:
  # Price volatility measures
  volatility24h: Decimal        # 24-hour price volatility (standard deviation)
  volatility7d: Decimal         # 7-day price volatility
  volatility30d: Decimal        # 30-day price volatility
  averageTrueRange: Decimal     # Average True Range (ATR)
  betaToMarket: Decimal         # Beta coefficient relative to market
  
  laws:
    - "all volatility values must be non-negative"
    - "expressed as percentage or decimal based on calculation method"
    - "ATR calculated using high-low-close methodology"
    - "beta relative to broader market index when available"

LiquidityMetrics:
  # Market liquidity indicators
  averageSpread: Decimal        # Average bid-ask spread percentage
  medianSpread: Decimal         # Median bid-ask spread percentage
  averageDepth: Decimal         # Average order book depth
  turnoverRatio: Decimal        # Volume/Market Cap ratio
  amihudRatio: Decimal          # Amihud illiquidity ratio
  
  laws:
    - "spread percentages between 0 and 100"
    - "depth values must be positive"
    - "turnover ratio must be non-negative"
    - "all metrics calculated from Level1/MarketDepth data"
```

## Analytics Operations

### Market Analytics Calculator Interface

**Purpose**: Compute market-wide analytics from market data

```yaml
MarketAnalyticsCalculator:
  operations:
    calculateMarketAnalytics:
      signature: "Market → DateRange → Result<MarketAnalytics>"
      behavior: "Compute comprehensive market analytics for specified period"
      laws:
        - "market determines scope of analytics calculation"
        - "dateRange specifies calculation period"
        - "returns complete MarketAnalytics with all metrics"
        - "requires sufficient data for meaningful calculations"
    
    calculateDominanceMetrics:
      signature: "Market → DateRange → Result<DominanceMetrics>"
      behavior: "Compute market dominance and concentration metrics"
      laws:
        - "calculates instrument and exchange concentration"
        - "based on market cap or volume weighting"
        - "requires data from multiple instruments"
        - "returns normalized percentage values"
    
    calculateChangeMetrics:
      signature: "Market → DateRange → Result<ChangeMetrics>"
      behavior: "Compute period-over-period change statistics"
      laws:
        - "calculates changes at multiple time horizons"
        - "based on market aggregate values"
        - "requires historical data for comparison periods"
        - "handles missing data gracefully"
    
    calculateVolatilityMetrics:
      signature: "Market → DateRange → Result<VolatilityMetrics>"
      behavior: "Compute market volatility and risk metrics"
      laws:
        - "calculates volatility at multiple time horizons"
        - "uses standard statistical methods"
        - "requires sufficient price history"
        - "handles data frequency appropriately"
    
    calculateLiquidityMetrics:
      signature: "Market → DateRange → Result<LiquidityMetrics>"
      behavior: "Compute market liquidity and depth metrics"
      laws:
        - "calculates spread and depth statistics"
        - "requires Level1 and/or MarketDepth data"
        - "aggregates across instruments and exchanges"
        - "handles sparse order book data"

universal_laws:
  - "all operations return Result<T> for error handling"
  - "market parameter determines data scope and filtering"
  - "dateRange determines calculation period and data window"
  - "insufficient data results in appropriate error, not partial results"
  - "calculations use appropriate statistical methods for financial data"
```

### Analytics Aggregation Interface

**Purpose**: Aggregate analytics across different dimensions

```yaml
AnalyticsAggregator:
  operations:
    aggregateByExchange:
      signature: "List<MarketAnalytics> → Result<Map<Exchange, MarketAnalytics>>"
      behavior: "Group and aggregate analytics by exchange"
      laws:
        - "preserves individual exchange analytics"
        - "maintains temporal alignment across exchanges"
        - "handles exchanges with no data"
        - "returns map from Exchange to aggregated analytics"
    
    aggregateByAssetClass:
      signature: "List<MarketAnalytics> → Result<Map<AssetClass, MarketAnalytics>>"
      behavior: "Group and aggregate analytics by asset class"
      laws:
        - "aggregates across all exchanges for each asset class"
        - "recalculates metrics appropriate for asset class level"
        - "handles asset classes with insufficient data"
        - "returns map from AssetClass to aggregated analytics"
    
    aggregateByTimeframe:
      signature: "List<MarketAnalytics> → Timeframe → Result<List<MarketAnalytics>>"
      behavior: "Aggregate analytics data into specified timeframes"
      laws:
        - "resamples analytics to target timeframe"
        - "uses appropriate aggregation methods per metric type"
        - "maintains chronological ordering"
        - "handles incomplete periods appropriately"
    
    createMarketSummary:
      signature: "List<MarketAnalytics> → Result<MarketSummary>"
      behavior: "Create high-level market summary from detailed analytics"
      laws:
        - "creates executive summary with key metrics"
        - "highlights significant changes and trends"
        - "includes confidence indicators for calculations"
        - "provides actionable market insights"

MarketSummary:
  # High-level market summary
  timestamp: DateTime
  market: Market
  period: DateRange
  
  # Key metrics
  totalValue: Decimal          # Total market value
  totalActivity: Decimal       # Total trading activity
  dominantInstrument: String   # Most dominant instrument
  dominantExchange: String     # Most dominant exchange
  
  # Trend indicators
  overallTrend: TrendDirection # UP, DOWN, SIDEWAYS
  volatilityLevel: VolatilityLevel # LOW, MEDIUM, HIGH
  liquidityLevel: LiquidityLevel   # LOW, MEDIUM, HIGH
  
  # Confidence metrics
  dataQuality: DataQuality     # EXCELLENT, GOOD, FAIR, POOR
  calculationConfidence: Decimal # Confidence level (0-1)

TrendDirection:
  enum: ["UP", "DOWN", "SIDEWAYS"]

VolatilityLevel:
  enum: ["LOW", "MEDIUM", "HIGH"]

LiquidityLevel:
  enum: ["LOW", "MEDIUM", "HIGH"]

DataQuality:
  enum: ["EXCELLENT", "GOOD", "FAIR", "POOR"]
```

## Analytics Configuration

### Analytics Service Configuration

```yaml
AnalyticsConfig:
  # Calculation parameters
  calculationEngine: CalculationEngine  # STANDARD, ENHANCED, CUSTOM
  precisionMode: PrecisionMode         # FAST, BALANCED, PRECISE
  
  # Time windows
  defaultTimeframes: List<Timeframe>   # Default calculation periods
  maxHistoryWindow: Duration           # Maximum lookback period
  minDataPoints: Integer               # Minimum data points for calculations
  
  # Thresholds
  volatilityThresholds: VolatilityThresholds
  liquidityThresholds: LiquidityThresholds
  dominanceThresholds: DominanceThresholds
  
  # Caching
  cacheConfig: AnalyticsCacheConfig
  refreshInterval: Duration
  
  # Data sources
  dataSources: List<DataSourceConfig>
  fallbackStrategy: FallbackStrategy

CalculationEngine:
  enum: ["STANDARD", "ENHANCED", "CUSTOM"]

PrecisionMode:
  enum: ["FAST", "BALANCED", "PRECISE"]

VolatilityThresholds:
  lowThreshold: Decimal      # Below this is LOW volatility
  highThreshold: Decimal     # Above this is HIGH volatility

LiquidityThresholds:
  tightSpreadThreshold: Decimal    # Below this is tight spread
  deepMarketThreshold: Decimal     # Above this is deep market

DominanceThresholds:
  significantShareThreshold: Decimal  # Threshold for significant market share
  concentrationThreshold: Decimal     # Threshold for market concentration warning
```

## Data Processing Patterns

### Analytics Data Flow

```yaml
data_processing_flow:
  input_stage:
    - "Retrieve market data using DSL readers"
    - "Validate data completeness and quality"
    - "Filter data by market, timeframe, and criteria"
  
  computation_stage:
    - "Apply appropriate statistical methods"
    - "Calculate base metrics (totals, averages, etc.)"
    - "Derive advanced metrics (volatility, ratios, etc.)"
    - "Validate calculation results"
  
  output_stage:
    - "Package results in analytics types"
    - "Apply business rule validations"
    - "Cache results for future use"
    - "Return structured analytics data"

error_handling_patterns:
  insufficient_data:
    - "Minimum data point requirements not met"
    - "Return specific error indicating required data volume"
  
  calculation_errors:
    - "Division by zero in ratio calculations"
    - "Invalid statistical inputs (e.g., negative variance)"
    - "Return computation error with context"
  
  data_quality_issues:
    - "Outliers affecting calculations"
    - "Missing data in critical periods"
    - "Return warning with data quality indicators"
```

### Analytics Composition Patterns

```yaml
composition_examples:
  basic_analytics:
    - "Read price data → Calculate market cap → Return analytics"
    - "Read OHLCV data → Calculate volatility → Return metrics"
  
  composite_analytics:
    - "Multiple data reads → Aggregate → Calculate comprehensive analytics"
    - "Historical comparison → Trend analysis → Change metrics"
  
  real_time_analytics:
    - "Streaming price updates → Incremental calculations → Live analytics"
    - "Event-driven recalculation → Cache invalidation → Updated metrics"

performance_considerations:
  caching_strategy:
    - "Cache expensive calculations with appropriate TTL"
    - "Invalidate cache on relevant data updates"
    - "Use incremental calculation where possible"
  
  calculation_optimization:
    - "Batch process multiple analytics requests"
    - "Use parallel computation for independent metrics"
    - "Optimize statistical calculations for financial data"
```

## Integration with DSL

### DSL Data Dependencies

Analytics layer consumes DSL market data types but does not modify DSL contracts:

```yaml
dsl_integration:
  consumption_pattern:
    - "Analytics reads MarketData<T> from DSL operations"
    - "Analytics extracts DataContext for routing and grouping"
    - "Analytics processes core data (Price, Level1, OHLCV, MarketDepth)"
    - "Analytics produces derived analytics types"
  
  separation_of_concerns:
    - "DSL provides pure market data vocabulary"
    - "Analytics provides derived business intelligence"
    - "No circular dependencies between layers"
    - "Analytics can evolve independently of DSL"
  
  data_flow_example:
    dsl_layer: "DataContext → MarketDataReader → Result<MarketData<Price>>"
    analytics_layer: "List<MarketData<Price>> → AnalyticsCalculator → Result<MarketAnalytics>"
    composition: "DSL Reader → Analytics Calculator → Business Intelligence"
```

### Error Handling Integration

```yaml
error_propagation:
  dsl_errors:
    - "DSL read failures propagate to analytics as input errors"
    - "Analytics layer adds context about calculation requirements"
    - "Maintains error traceability from data source to analytics"
  
  analytics_errors:
    - "Analytics calculation errors are separate from DSL errors"
    - "Use COMPUTATION error category for calculation-specific failures"
    - "Provide detailed context about calculation requirements and failures"
```

## Standards Compliance

### Financial Analytics Standards

```yaml
calculation_standards:
  volatility_calculations:
    standard_deviation: "Population standard deviation for price returns"
    annualization: "Sqrt(252) for daily data, sqrt(365*24) for hourly"
    return_calculation: "Log returns for volatility, simple returns for changes"
  
  market_cap_calculations:
    methodology: "Price × Circulating Supply (when available)"
    aggregation: "Sum across all instruments in market"
    currency_normalization: "Convert to common currency for aggregation"
  
  dominance_calculations:
    herfindahl_index: "Sum of squared market shares for concentration"
    market_share: "Individual value / total market value"
    ranking_methodology: "By market cap, volume, or specified metric"

industry_standards:
  bloomberg_compatibility: "Align with Bloomberg terminal analytics where applicable"
  reuters_compatibility: "Align with Thomson Reuters analytics where applicable"
  financial_modeling: "Use standard financial modeling practices"
  risk_management: "Align with common risk management metrics"
```

## Usage Patterns

### Basic Analytics Calculation

```
// Language-agnostic analytics patterns

// Configure analytics service
config = AnalyticsConfig{
  calculationEngine: STANDARD,
  precisionMode: BALANCED,
  defaultTimeframes: ["1h", "24h", "7d"],
  minDataPoints: 100
}

calculator = createMarketAnalyticsCalculator(config)

// Define market and period
cryptoMarket = Market{type: CRYPTO, region: "GLOBAL", segment: "CASH"}
period = DateRange{startDate: "2024-01-01T00:00:00Z", endDate: "2024-01-31T23:59:59Z"}

// Calculate comprehensive analytics
analyticsResult = calculateMarketAnalytics(cryptoMarket, period, calculator)

if isSuccess(analyticsResult) then
  analytics = getData(analyticsResult)
  
  // Extract key metrics
  totalValue = analytics.totalMarketCap
  volatility = analytics.volatilityMetrics.volatility24h
  dominance = analytics.dominanceMetrics.topInstrumentShare
  
  // Business intelligence
  if volatility > config.volatilityThresholds.highThreshold then
    handleHighVolatility(analytics)
  end
  
  if dominance > config.dominanceThresholds.concentrationThreshold then
    handleMarketConcentration(analytics)
  end
else
  error = getError(analyticsResult)
  handleAnalyticsError(error)
end
```

### Composite Analytics with DSL Integration

```
// Combining DSL reads with analytics calculations

// Step 1: Retrieve market data using DSL
contexts = getMarketContexts(cryptoMarket)
priceDataResult = getCurrentPrices(contexts, marketDataReader)
ohlcvDataResult = getOHLCVHistory(contexts[0], "1h", period, marketDataReader)

if isSuccess(priceDataResult) and isSuccess(ohlcvDataResult) then
  priceData = getData(priceDataResult)
  ohlcvData = getData(ohlcvDataResult)
  
  // Step 2: Calculate analytics from market data
  volatilityResult = calculateVolatilityMetrics(ohlcvData, calculator)
  dominanceResult = calculateDominanceMetrics(priceData, calculator)
  
  if isSuccess(volatilityResult) and isSuccess(dominanceResult) then
    // Step 3: Combine results
    combinedAnalytics = MarketAnalytics{
      timestamp: currentTime(),
      market: cryptoMarket,
      calculationPeriod: period,
      volatilityMetrics: getData(volatilityResult),
      dominanceMetrics: getData(dominanceResult),
      // ... other metrics
    }
    
    processAnalytics(combinedAnalytics)
  end
end
```

## Contract Verification

### Analytics Contract Tests

```yaml
market_analytics_tests:
  - "MarketAnalytics with valid market and period → valid"
  - "MarketAnalytics with negative market cap → invalid"
  - "MarketAnalytics with invalid date range → invalid"
  - "DominanceMetrics with percentages > 100 → invalid"
  - "VolatilityMetrics with negative volatility → invalid"

calculation_tests:
  - "Calculate analytics with sufficient data → Result<MarketAnalytics>"
  - "Calculate analytics with insufficient data → Result<Error>"
  - "Calculate volatility with valid OHLCV → Result<VolatilityMetrics>"
  - "Calculate dominance with single instrument → Result<DominanceMetrics>"

integration_tests:
  - "DSL read → Analytics calculation → Valid analytics output"
  - "DSL read failure → Analytics error propagation"
  - "Multiple market analytics → Aggregation → Summary analytics"
```

---

**Analytics Contract Compliance**: Any implementation claiming @qi/dp Analytics compatibility must implement ALL analytics types and operations exactly as specified, while maintaining complete freedom in calculation methodologies, optimization strategies, and business logic implementation.

**Separation from DSL**: Analytics contracts are completely separate from DSL contracts. DSL provides the vocabulary for market data; Analytics provides the intelligence derived from that data.
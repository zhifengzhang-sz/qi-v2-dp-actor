import type { Result } from "@qi/base";
import type * as DSL from "../../dsl";
import { BaseActor } from "./BaseActor";

/**
 * HistoricalReader abstract class - extends BaseActor and implements HistoricalMarketDataReader interface from DSL Part II
 *
 * Specialized for historical data operations with emphasis on:
 * - Chronological ordering
 * - Date range validation
 * - Batch operations with atomic success/failure semantics
 */
export abstract class HistoricalReader extends BaseActor implements DSL.HistoricalMarketDataReader {
  // HistoricalMarketDataReader Contract (DSL Part II) - implemented with handler delegation
  async getPriceHistory(
    context: DSL.DataContext,
    range: DSL.DateRange
  ): Promise<Result<DSL.MarketData<DSL.Price>[]>> {
    return this.workflow(
      this.getPriceHistoryHandler(context, range),
      "HISTORICAL_PRICE_FETCH_ERROR",
      {
        operation: "getPriceHistory",
        context,
        range,
      }
    );
  }

  async getLevel1History(
    context: DSL.DataContext,
    range: DSL.DateRange
  ): Promise<Result<DSL.MarketData<DSL.Level1>[]>> {
    return this.workflow(
      this.getLevel1HistoryHandler(context, range),
      "HISTORICAL_LEVEL1_FETCH_ERROR",
      {
        operation: "getLevel1History",
        context,
        range,
      }
    );
  }

  async getOHLCVHistory(
    context: DSL.DataContext,
    timeframe: DSL.Timeframe,
    range: DSL.DateRange
  ): Promise<Result<DSL.MarketData<DSL.OHLCV>[]>> {
    return this.workflow(
      this.getOHLCVHistoryHandler(context, timeframe, range),
      "HISTORICAL_OHLCV_FETCH_ERROR",
      {
        operation: "getOHLCVHistory",
        context,
        timeframe,
        range,
      }
    );
  }

  async getMarketDepthHistory(
    context: DSL.DataContext,
    levels: DSL.Levels,
    range: DSL.DateRange
  ): Promise<Result<DSL.MarketData<DSL.MarketDepth>[]>> {
    return this.workflow(
      this.getMarketDepthHistoryHandler(context, levels, range),
      "HISTORICAL_MARKET_DEPTH_FETCH_ERROR",
      {
        operation: "getMarketDepthHistory",
        context,
        levels,
        range,
      }
    );
  }

  // Abstract handler methods - concrete classes must implement these with Result<T> patterns
  protected abstract getPriceHistoryHandler(
    context: DSL.DataContext,
    range: DSL.DateRange
  ): Promise<Result<DSL.MarketData<DSL.Price>[]>>;
  protected abstract getLevel1HistoryHandler(
    context: DSL.DataContext,
    range: DSL.DateRange
  ): Promise<Result<DSL.MarketData<DSL.Level1>[]>>;
  protected abstract getOHLCVHistoryHandler(
    context: DSL.DataContext,
    timeframe: DSL.Timeframe,
    range: DSL.DateRange
  ): Promise<Result<DSL.MarketData<DSL.OHLCV>[]>>;
  protected abstract getMarketDepthHistoryHandler(
    context: DSL.DataContext,
    levels: DSL.Levels,
    range: DSL.DateRange
  ): Promise<Result<DSL.MarketData<DSL.MarketDepth>[]>>;
}

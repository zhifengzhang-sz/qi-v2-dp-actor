import type { Result } from "@qi/base";
import type * as DSL from "../../dsl";
import { BaseActor } from "./BaseActor";

/**
 * Reader abstract class - extends BaseActor and implements MarketDataReader interface from DSL Part II
 *
 * Provides workflow abstraction for reader operations while delegating concrete implementation
 * to handler methods that must be implemented by concrete classes.
 */
export abstract class Reader extends BaseActor implements DSL.MarketDataReader {
  // MarketDataReader Contract (DSL Part II) - implemented with workflow abstraction
  async getCurrentPrice(context: DSL.DataContext): Promise<Result<DSL.MarketData<DSL.Price>>> {
    return this.workflow(this.getCurrentPriceHandler(context), "PRICE_FETCH_ERROR", {
      operation: "getCurrentPrice",
      context,
    });
  }

  async getCurrentPrices(
    contexts: DSL.DataContext[]
  ): Promise<Result<DSL.MarketData<DSL.Price>[]>> {
    return this.workflow(this.getCurrentPricesHandler(contexts), "PRICES_FETCH_ERROR", {
      operation: "getCurrentPrices",
      contextCount: contexts.length,
    });
  }

  async getLevel1(context: DSL.DataContext): Promise<Result<DSL.MarketData<DSL.Level1>>> {
    return this.workflow(this.getLevel1Handler(context), "LEVEL1_FETCH_ERROR", {
      operation: "getLevel1",
      context,
    });
  }

  async getMarketDepth(
    context: DSL.DataContext,
    levels: DSL.Levels
  ): Promise<Result<DSL.MarketData<DSL.MarketDepth>>> {
    return this.workflow(this.getMarketDepthHandler(context, levels), "MARKET_DEPTH_FETCH_ERROR", {
      operation: "getMarketDepth",
      context,
      levels,
    });
  }

  async getOHLCV(
    context: DSL.DataContext,
    timeframe: DSL.Timeframe
  ): Promise<Result<DSL.MarketData<DSL.OHLCV>>> {
    return this.workflow(this.getOHLCVHandler(context, timeframe), "OHLCV_FETCH_ERROR", {
      operation: "getOHLCV",
      context,
      timeframe,
    });
  }

  async getPriceHistory(
    context: DSL.DataContext,
    range: DSL.DateRange
  ): Promise<Result<DSL.MarketData<DSL.Price>[]>> {
    return this.workflow(this.getPriceHistoryHandler(context, range), "PRICE_HISTORY_FETCH_ERROR", {
      operation: "getPriceHistory",
      context,
      range,
    });
  }

  async getLevel1History(
    context: DSL.DataContext,
    range: DSL.DateRange
  ): Promise<Result<DSL.MarketData<DSL.Level1>[]>> {
    return this.workflow(
      this.getLevel1HistoryHandler(context, range),
      "LEVEL1_HISTORY_FETCH_ERROR",
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
      "OHLCV_HISTORY_FETCH_ERROR",
      {
        operation: "getOHLCVHistory",
        context,
        timeframe,
        range,
      }
    );
  }

  // Abstract handler methods - concrete classes must implement these with Result<T> patterns
  protected abstract getCurrentPriceHandler(
    context: DSL.DataContext
  ): Promise<Result<DSL.MarketData<DSL.Price>>>;
  protected abstract getCurrentPricesHandler(
    contexts: DSL.DataContext[]
  ): Promise<Result<DSL.MarketData<DSL.Price>[]>>;
  protected abstract getLevel1Handler(
    context: DSL.DataContext
  ): Promise<Result<DSL.MarketData<DSL.Level1>>>;
  protected abstract getMarketDepthHandler(
    context: DSL.DataContext,
    levels: DSL.Levels
  ): Promise<Result<DSL.MarketData<DSL.MarketDepth>>>;
  protected abstract getOHLCVHandler(
    context: DSL.DataContext,
    timeframe: DSL.Timeframe
  ): Promise<Result<DSL.MarketData<DSL.OHLCV>>>;
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
}

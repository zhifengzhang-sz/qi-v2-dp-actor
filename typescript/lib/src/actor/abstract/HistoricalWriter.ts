import type { Result } from "@qi/base";
import type * as DSL from "../../dsl";
import { BaseActor } from "./BaseActor";

/**
 * HistoricalWriter abstract class - extends BaseActor and implements HistoricalMarketDataWriter interface from DSL Part II
 *
 * Specialized for historical data storage operations with emphasis on:
 * - Batch operations with atomic success/failure semantics
 * - Chronological ordering maintenance during storage
 * - Data deduplication handling for batch operations
 */
export abstract class HistoricalWriter extends BaseActor implements DSL.HistoricalMarketDataWriter {
  // HistoricalMarketDataWriter Contract (DSL Part II) - implemented with handler delegation
  async writePriceHistory(data: DSL.MarketData<DSL.Price>[]): Promise<Result<void>> {
    return this.workflow(this.writePriceHistoryHandler(data), "HISTORICAL_PRICE_WRITE_ERROR", {
      operation: "writePriceHistory",
      dataCount: data.length,
    });
  }

  async writeLevel1History(data: DSL.MarketData<DSL.Level1>[]): Promise<Result<void>> {
    return this.workflow(this.writeLevel1HistoryHandler(data), "HISTORICAL_LEVEL1_WRITE_ERROR", {
      operation: "writeLevel1History",
      dataCount: data.length,
    });
  }

  async writeOHLCVHistory(data: DSL.MarketData<DSL.OHLCV>[]): Promise<Result<void>> {
    return this.workflow(this.writeOHLCVHistoryHandler(data), "HISTORICAL_OHLCV_WRITE_ERROR", {
      operation: "writeOHLCVHistory",
      dataCount: data.length,
    });
  }

  async writeMarketDepthHistory(data: DSL.MarketData<DSL.MarketDepth>[]): Promise<Result<void>> {
    return this.workflow(
      this.writeMarketDepthHistoryHandler(data),
      "HISTORICAL_MARKET_DEPTH_WRITE_ERROR",
      {
        operation: "writeMarketDepthHistory",
        dataCount: data.length,
      }
    );
  }

  // Abstract handler methods - concrete classes must implement these with Result<T> patterns
  protected abstract writePriceHistoryHandler(
    data: DSL.MarketData<DSL.Price>[]
  ): Promise<Result<void>>;
  protected abstract writeLevel1HistoryHandler(
    data: DSL.MarketData<DSL.Level1>[]
  ): Promise<Result<void>>;
  protected abstract writeOHLCVHistoryHandler(
    data: DSL.MarketData<DSL.OHLCV>[]
  ): Promise<Result<void>>;
  protected abstract writeMarketDepthHistoryHandler(
    data: DSL.MarketData<DSL.MarketDepth>[]
  ): Promise<Result<void>>;
}

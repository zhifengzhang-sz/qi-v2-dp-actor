import type { Result } from "@qi/base";
import type * as DSL from "../../dsl";
import { BaseActor } from "./BaseActor";

/**
 * Writer abstract class - extends BaseActor and implements MarketDataWriter interface from DSL Part II
 *
 * Provides workflow abstraction for writer operations while delegating concrete implementation
 * to handler methods that must be implemented by concrete classes.
 */
export abstract class Writer extends BaseActor implements DSL.MarketDataWriter {
  // MarketDataWriter Contract (DSL Part II) - implemented with handler delegation
  async writePrice(data: DSL.MarketData<DSL.Price>): Promise<Result<void>> {
    return this.workflow(this.writePriceHandler(data), "PRICE_WRITE_ERROR", {
      operation: "writePrice",
      data,
    });
  }

  async writePrices(data: DSL.MarketData<DSL.Price>[]): Promise<Result<void>> {
    return this.workflow(this.writePricesHandler(data), "PRICES_WRITE_ERROR", {
      operation: "writePrices",
      dataCount: data.length,
    });
  }

  async writeLevel1(data: DSL.MarketData<DSL.Level1>): Promise<Result<void>> {
    return this.workflow(this.writeLevel1Handler(data), "LEVEL1_WRITE_ERROR", {
      operation: "writeLevel1",
      data,
    });
  }

  async writeMarketDepth(data: DSL.MarketData<DSL.MarketDepth>): Promise<Result<void>> {
    return this.workflow(this.writeMarketDepthHandler(data), "MARKET_DEPTH_WRITE_ERROR", {
      operation: "writeMarketDepth",
      data,
    });
  }

  async writeOHLCV(data: DSL.MarketData<DSL.OHLCV>): Promise<Result<void>> {
    return this.workflow(this.writeOHLCVHandler(data), "OHLCV_WRITE_ERROR", {
      operation: "writeOHLCV",
      data,
    });
  }

  async writeOHLCVBatch(data: DSL.MarketData<DSL.OHLCV>[]): Promise<Result<void>> {
    return this.workflow(this.writeOHLCVBatchHandler(data), "OHLCV_BATCH_WRITE_ERROR", {
      operation: "writeOHLCVBatch",
      dataCount: data.length,
    });
  }

  // Abstract handler methods - concrete classes must implement these with Result<T> patterns
  protected abstract writePriceHandler(data: DSL.MarketData<DSL.Price>): Promise<Result<void>>;
  protected abstract writePricesHandler(data: DSL.MarketData<DSL.Price>[]): Promise<Result<void>>;
  protected abstract writeLevel1Handler(data: DSL.MarketData<DSL.Level1>): Promise<Result<void>>;
  protected abstract writeMarketDepthHandler(
    data: DSL.MarketData<DSL.MarketDepth>
  ): Promise<Result<void>>;
  protected abstract writeOHLCVHandler(data: DSL.MarketData<DSL.OHLCV>): Promise<Result<void>>;
  protected abstract writeOHLCVBatchHandler(
    data: DSL.MarketData<DSL.OHLCV>[]
  ): Promise<Result<void>>;
}

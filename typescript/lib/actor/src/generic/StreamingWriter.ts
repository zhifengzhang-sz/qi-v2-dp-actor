import type { Result } from "@qi/base";
import type * as DSL from "@qi/dp/dsl";
import { BaseActor } from "./BaseActor.js";

/**
 * StreamingWriter abstract class - extends BaseActor and implements StreamingMarketDataWriter interface from DSL Part II
 *
 * Specialized for real-time streaming output operations with emphasis on:
 * - Non-blocking operations that don't block data processing
 * - Buffer management and backpressure handling
 * - Stream health monitoring and connection status
 */
export abstract class StreamingWriter extends BaseActor implements DSL.StreamingMarketDataWriter {
  // StreamingMarketDataWriter Contract (DSL Part II) - implemented with handler delegation
  async startPriceStream(context: DSL.DataContext): Promise<Result<DSL.PriceStream>> {
    return this.workflow(this.startPriceStreamHandler(context), "PRICE_STREAM_START_ERROR", {
      operation: "startPriceStream",
      context,
    });
  }

  async startLevel1Stream(context: DSL.DataContext): Promise<Result<DSL.Level1Stream>> {
    return this.workflow(this.startLevel1StreamHandler(context), "LEVEL1_STREAM_START_ERROR", {
      operation: "startLevel1Stream",
      context,
    });
  }

  async startMarketDepthStream(
    context: DSL.DataContext,
    levels: DSL.Levels,
  ): Promise<Result<DSL.MarketDepthStream>> {
    return this.workflow(
      this.startMarketDepthStreamHandler(context, levels),
      "MARKET_DEPTH_STREAM_START_ERROR",
      {
        operation: "startMarketDepthStream",
        context,
        levels,
      },
    );
  }

  async startOHLCVStream(
    context: DSL.DataContext,
    timeframe: DSL.Timeframe,
  ): Promise<Result<DSL.OHLCVStream>> {
    return this.workflow(
      this.startOHLCVStreamHandler(context, timeframe),
      "OHLCV_STREAM_START_ERROR",
      {
        operation: "startOHLCVStream",
        context,
        timeframe,
      },
    );
  }

  // Abstract handler methods - concrete classes must implement these with Result<T> patterns
  protected abstract startPriceStreamHandler(
    context: DSL.DataContext,
  ): Promise<Result<DSL.PriceStream>>;
  protected abstract startLevel1StreamHandler(
    context: DSL.DataContext,
  ): Promise<Result<DSL.Level1Stream>>;
  protected abstract startMarketDepthStreamHandler(
    context: DSL.DataContext,
    levels: DSL.Levels,
  ): Promise<Result<DSL.MarketDepthStream>>;
  protected abstract startOHLCVStreamHandler(
    context: DSL.DataContext,
    timeframe: DSL.Timeframe,
  ): Promise<Result<DSL.OHLCVStream>>;
}

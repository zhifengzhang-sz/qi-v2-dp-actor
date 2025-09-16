import type { Result } from "@qi/base";
import type * as DSL from "@qi/dp/dsl";
import { BaseActor } from "./BaseActor.js";

/**
 * StreamingReader abstract class - extends BaseActor and implements StreamingMarketDataReader interface from DSL Part II
 *
 * Specialized for real-time streaming operations with emphasis on:
 * - Subscription management and lifecycle
 * - Non-blocking callback execution
 * - Stream reliability and reconnection handling
 */
export abstract class StreamingReader extends BaseActor implements DSL.StreamingMarketDataReader {
  // StreamingMarketDataReader Contract (DSL Part II) - implemented with handler delegation
  async subscribePriceStream(
    context: DSL.DataContext,
    callback: (data: DSL.MarketData<DSL.Price>) => void,
  ): Promise<Result<DSL.Subscription>> {
    return this.workflow(
      this.subscribePriceStreamHandler(context, callback),
      "PRICE_STREAM_SUBSCRIBE_ERROR",
      {
        operation: "subscribePriceStream",
        context,
      },
    );
  }

  async subscribeLevel1Stream(
    context: DSL.DataContext,
    callback: (data: DSL.MarketData<DSL.Level1>) => void,
  ): Promise<Result<DSL.Subscription>> {
    return this.workflow(
      this.subscribeLevel1StreamHandler(context, callback),
      "LEVEL1_STREAM_SUBSCRIBE_ERROR",
      {
        operation: "subscribeLevel1Stream",
        context,
      },
    );
  }

  async subscribeMarketDepthStream(
    context: DSL.DataContext,
    levels: DSL.Levels,
    callback: (data: DSL.MarketData<DSL.MarketDepth>) => void,
  ): Promise<Result<DSL.Subscription>> {
    return this.workflow(
      this.subscribeMarketDepthStreamHandler(context, levels, callback),
      "MARKET_DEPTH_STREAM_SUBSCRIBE_ERROR",
      {
        operation: "subscribeMarketDepthStream",
        context,
        levels,
      },
    );
  }

  async subscribeOHLCVStream(
    context: DSL.DataContext,
    timeframe: DSL.Timeframe,
    callback: (data: DSL.MarketData<DSL.OHLCV>) => void,
  ): Promise<Result<DSL.Subscription>> {
    return this.workflow(
      this.subscribeOHLCVStreamHandler(context, timeframe, callback),
      "OHLCV_STREAM_SUBSCRIBE_ERROR",
      {
        operation: "subscribeOHLCVStream",
        context,
        timeframe,
      },
    );
  }

  async unsubscribe(subscription: DSL.Subscription): Promise<Result<void>> {
    return this.workflow(this.unsubscribeHandler(subscription), "STREAM_UNSUBSCRIBE_ERROR", {
      operation: "unsubscribe",
      subscription,
    });
  }

  // Abstract handler methods - concrete classes must implement these with Result<T> patterns
  protected abstract subscribePriceStreamHandler(
    context: DSL.DataContext,
    callback: (data: DSL.MarketData<DSL.Price>) => void,
  ): Promise<Result<DSL.Subscription>>;
  protected abstract subscribeLevel1StreamHandler(
    context: DSL.DataContext,
    callback: (data: DSL.MarketData<DSL.Level1>) => void,
  ): Promise<Result<DSL.Subscription>>;
  protected abstract subscribeMarketDepthStreamHandler(
    context: DSL.DataContext,
    levels: DSL.Levels,
    callback: (data: DSL.MarketData<DSL.MarketDepth>) => void,
  ): Promise<Result<DSL.Subscription>>;
  protected abstract subscribeOHLCVStreamHandler(
    context: DSL.DataContext,
    timeframe: DSL.Timeframe,
    callback: (data: DSL.MarketData<DSL.OHLCV>) => void,
  ): Promise<Result<DSL.Subscription>>;
  protected abstract unsubscribeHandler(subscription: DSL.Subscription): Promise<Result<void>>;
}

import type { QiError, Result } from "@qi/base";
import { Err, Ok, create } from "@qi/base";
import type * as DSL from "@qi/dp/dsl";
import { MCPBaseActor } from "./MCPBaseActor.js";

/**
 * MCP Streaming Reader - implements DSL.StreamingMarketDataReader using MCP client
 *
 * Hides MCP protocol details and provides clean DSL interface for streaming data
 */
export class MCPStreamingReader extends MCPBaseActor implements DSL.StreamingMarketDataReader {
  async subscribePriceStream(
    context: DSL.DataContext,
    callback: (data: DSL.MarketData<DSL.Price>) => void
  ): Promise<Result<DSL.Subscription, QiError>> {
    return this.workflow(
      this.callMCPTool("subscribe_price_stream", { context, callback }),
      "PRICE_STREAM_SUBSCRIBE_ERROR"
    );
  }

  async subscribeLevel1Stream(
    context: DSL.DataContext,
    callback: (data: DSL.MarketData<DSL.Level1>) => void
  ): Promise<Result<DSL.Subscription, QiError>> {
    return this.workflow(
      this.callMCPTool("subscribe_level1_stream", { context, callback }),
      "LEVEL1_STREAM_SUBSCRIBE_ERROR"
    );
  }

  async subscribeMarketDepthStream(
    context: DSL.DataContext,
    levels: DSL.Levels,
    callback: (data: DSL.MarketData<DSL.MarketDepth>) => void
  ): Promise<Result<DSL.Subscription, QiError>> {
    return this.workflow(
      this.callMCPTool("subscribe_market_depth_stream", { context, levels, callback }),
      "MARKET_DEPTH_STREAM_SUBSCRIBE_ERROR"
    );
  }

  async subscribeOHLCVStream(
    context: DSL.DataContext,
    timeframe: DSL.Timeframe,
    callback: (data: DSL.MarketData<DSL.OHLCV>) => void
  ): Promise<Result<DSL.Subscription, QiError>> {
    return this.workflow(
      this.callMCPTool("subscribe_ohlcv_stream", { context, timeframe, callback }),
      "OHLCV_STREAM_SUBSCRIBE_ERROR"
    );
  }

  async unsubscribe(subscription: DSL.Subscription): Promise<Result<void, QiError>> {
    return this.workflow(this.callMCPTool("unsubscribe", { subscription }), "UNSUBSCRIBE_ERROR");
  }

  private async callMCPTool(name: string, args: any): Promise<Result<any, QiError>> {
    const result = await this.callTool(name, args);
    return result.tag === "success"
      ? Ok(result.value)
      : Err(
          create("MCP_TOOL_ERROR", `MCP tool call failed: ${result.error.message}`, "SYSTEM", {
            tool: name,
            args,
            originalError: result.error.message,
          })
        );
  }
}

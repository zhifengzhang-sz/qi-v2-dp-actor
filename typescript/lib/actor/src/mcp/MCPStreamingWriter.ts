import type { QiError, Result } from "@qi/base";
import { create, Err, Ok } from "@qi/base";
import type * as DSL from "@qi/dp/dsl";
import { MCPBaseActor } from "./MCPBaseActor.js";

/**
 * MCP Streaming Writer - implements DSL.StreamingMarketDataWriter using MCP client
 *
 * Hides MCP protocol details and provides clean DSL interface for streaming writes
 */
export class MCPStreamingWriter extends MCPBaseActor implements DSL.StreamingMarketDataWriter {
  async startPriceStream(context: DSL.DataContext): Promise<Result<DSL.PriceStream, QiError>> {
    return this.workflow(
      this.callMCPTool("start_price_stream", { context }),
      "PRICE_STREAM_START_ERROR",
    );
  }

  async startLevel1Stream(context: DSL.DataContext): Promise<Result<DSL.Level1Stream, QiError>> {
    return this.workflow(
      this.callMCPTool("start_level1_stream", { context }),
      "LEVEL1_STREAM_START_ERROR",
    );
  }

  async startMarketDepthStream(
    context: DSL.DataContext,
    levels: DSL.Levels,
  ): Promise<Result<DSL.MarketDepthStream, QiError>> {
    return this.workflow(
      this.callMCPTool("start_market_depth_stream", { context, levels }),
      "MARKET_DEPTH_STREAM_START_ERROR",
    );
  }

  async startOHLCVStream(
    context: DSL.DataContext,
    timeframe: DSL.Timeframe,
  ): Promise<Result<DSL.OHLCVStream, QiError>> {
    return this.workflow(
      this.callMCPTool("start_ohlcv_stream", { context, timeframe }),
      "OHLCV_STREAM_START_ERROR",
    );
  }

  private async callMCPTool<T>(
    name: string,
    args: Record<string, unknown>,
  ): Promise<Result<T, QiError>> {
    const result = await this.callTool(name, args);
    return result.tag === "success"
      ? Ok(result.value as T)
      : Err(
          create("MCP_TOOL_ERROR", `MCP tool call failed: ${result.error.message}`, "SYSTEM", {
            tool: name,
            args,
            originalError: result.error.message,
          }),
        );
  }
}

import type { QiError, Result } from "@qi/base";
import { create, Err, Ok } from "@qi/base";
import type * as DSL from "@qi/dp/dsl";
import { MCPBaseActor } from "./MCPBaseActor.js";

/**
 * MCP Market Data Writer - implements DSL.MarketDataWriter using MCP client
 *
 * Hides MCP protocol details and provides clean DSL interface
 */
export class MCPMarketDataWriter extends MCPBaseActor implements DSL.MarketDataWriter {
  async writePrice(data: DSL.MarketData<DSL.Price>): Promise<Result<void, QiError>> {
    return this.workflow(this.callMCPTool("write_price", { data }), "PRICE_WRITE_ERROR");
  }

  async writePrices(data: DSL.MarketData<DSL.Price>[]): Promise<Result<void, QiError>> {
    return this.workflow(this.callMCPTool("write_prices", { data }), "PRICES_WRITE_ERROR");
  }

  async writeLevel1(data: DSL.MarketData<DSL.Level1>): Promise<Result<void, QiError>> {
    return this.workflow(this.callMCPTool("write_level1", { data }), "LEVEL1_WRITE_ERROR");
  }

  async writeMarketDepth(data: DSL.MarketData<DSL.MarketDepth>): Promise<Result<void, QiError>> {
    return this.workflow(
      this.callMCPTool("write_market_depth", { data }),
      "MARKET_DEPTH_WRITE_ERROR",
    );
  }

  async writeOHLCV(data: DSL.MarketData<DSL.OHLCV>): Promise<Result<void, QiError>> {
    return this.workflow(this.callMCPTool("write_ohlcv", { data }), "OHLCV_WRITE_ERROR");
  }

  async writeOHLCVBatch(data: DSL.MarketData<DSL.OHLCV>[]): Promise<Result<void, QiError>> {
    return this.workflow(
      this.callMCPTool("write_ohlcv_batch", { data }),
      "OHLCV_BATCH_WRITE_ERROR",
    );
  }

  private async callMCPTool(
    name: string,
    args: Record<string, unknown>,
  ): Promise<Result<void, QiError>> {
    const result = await this.callTool(name, args);
    return result.tag === "success"
      ? Ok(undefined)
      : Err(
          create("MCP_TOOL_ERROR", `MCP tool call failed: ${result.error.message}`, "SYSTEM", {
            tool: name,
            args,
            originalError: result.error.message,
          }),
        );
  }
}

import type { QiError, Result } from "@qi/base";
import { Err, Ok, create, flatMap } from "@qi/base";
import type * as DSL from "@qi/dp/dsl";
import { MCPBaseActor, type MCPConnectionConfig } from "./MCPBaseActor.js";

/**
 * MCP Market Data Reader - implements DSL.MarketDataReader using MCP client
 *
 * Hides MCP protocol details and provides clean DSL interface.
 * Supports both stdio and WebSocket transports for maximum flexibility.
 */
export class MCPMarketDataReader extends MCPBaseActor implements DSL.MarketDataReader {
  constructor(context: DSL.DataContext, config: MCPConnectionConfig) {
    super(context, config);
  }

  // Legacy constructor support
  static override createWithCommand(
    context: DSL.DataContext,
    serverCommand: string[]
  ): MCPMarketDataReader {
    const config: MCPConnectionConfig = {
      type: "stdio",
      stdio: {
        command: serverCommand[0] || "",
        args: serverCommand.slice(1),
      },
    };
    return new MCPMarketDataReader(context, config);
  }
  async getCurrentPrice(
    context: DSL.DataContext
  ): Promise<Result<DSL.MarketData<DSL.Price>, QiError>> {
    return this.workflow(this.callMCPTool("get_current_price", { context }), "PRICE_FETCH_ERROR");
  }

  async getCurrentPrices(
    contexts: DSL.DataContext[]
  ): Promise<Result<DSL.MarketData<DSL.Price>[], QiError>> {
    return this.workflow(
      this.callMCPTool("get_current_prices", { contexts }),
      "PRICES_FETCH_ERROR"
    );
  }

  async getLevel1(context: DSL.DataContext): Promise<Result<DSL.MarketData<DSL.Level1>, QiError>> {
    return this.workflow(this.callMCPTool("get_level1", { context }), "LEVEL1_FETCH_ERROR");
  }

  async getMarketDepth(
    context: DSL.DataContext,
    levels: DSL.Levels
  ): Promise<Result<DSL.MarketData<DSL.MarketDepth>, QiError>> {
    return this.workflow(
      this.callMCPTool("get_market_depth", { context, levels }),
      "MARKET_DEPTH_FETCH_ERROR"
    );
  }

  async getOHLCV(
    context: DSL.DataContext,
    timeframe: DSL.Timeframe
  ): Promise<Result<DSL.MarketData<DSL.OHLCV>, QiError>> {
    return this.workflow(
      this.callMCPTool("get_ohlcv", { context, timeframe }),
      "OHLCV_FETCH_ERROR"
    );
  }

  async getPriceHistory(
    context: DSL.DataContext,
    range: DSL.DateRange
  ): Promise<Result<DSL.MarketData<DSL.Price>[], QiError>> {
    return this.workflow(
      this.callMCPTool("get_price_history", { context, range }),
      "PRICE_HISTORY_FETCH_ERROR"
    );
  }

  async getLevel1History(
    context: DSL.DataContext,
    range: DSL.DateRange
  ): Promise<Result<DSL.MarketData<DSL.Level1>[], QiError>> {
    return this.workflow(
      this.callMCPTool("get_level1_history", { context, range }),
      "LEVEL1_HISTORY_FETCH_ERROR"
    );
  }

  async getOHLCVHistory(
    context: DSL.DataContext,
    timeframe: DSL.Timeframe,
    range: DSL.DateRange
  ): Promise<Result<DSL.MarketData<DSL.OHLCV>[], QiError>> {
    return this.workflow(
      this.callMCPTool("get_ohlcv_history", { context, timeframe, range }),
      "OHLCV_HISTORY_FETCH_ERROR"
    );
  }

  private async callMCPTool(name: string, args: any): Promise<Result<any, QiError>> {
    const result = await this.callTool(name, args);
    return flatMap(
      (data) => Ok(data),
      result.tag === "success"
        ? Ok(result.value)
        : Err(
            create("MCP_TOOL_ERROR", `MCP tool call failed: ${result.error.message}`, "SYSTEM", {
              tool: name,
              args,
              originalError: result.error.message,
            })
          )
    );
  }
}

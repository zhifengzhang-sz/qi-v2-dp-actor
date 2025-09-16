import type { QiError, Result } from "@qi/base";
import { create, Err, flatMap, Ok } from "@qi/base";
import type * as DSL from "@qi/dp/dsl";
import { MCPBaseActor, type MCPConnectionConfig } from "./MCPBaseActor.js";

/**
 * MCP Market Data Reader - implements DSL.MarketDataReader using MCP client
 *
 * Hides MCP protocol details and provides clean DSL interface.
 * Supports both stdio and WebSocket transports for maximum flexibility.
 */
export class MCPMarketDataReader extends MCPBaseActor implements DSL.MarketDataReader {
  // Legacy constructor support
  static override createWithCommand(
    context: DSL.DataContext,
    serverCommand: string[],
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
    context: DSL.DataContext,
  ): Promise<Result<DSL.MarketData<DSL.Price>, QiError>> {
    return this.workflow(
      this.callMCPTool<DSL.MarketData<DSL.Price>>("get_current_price", { context }),
      "PRICE_FETCH_ERROR",
      {
        operation: "getCurrentPrice",
        context,
      },
    );
  }

  async getCurrentPrices(
    contexts: DSL.DataContext[],
  ): Promise<Result<DSL.MarketData<DSL.Price>[], QiError>> {
    return this.workflow(
      this.callMCPTool<DSL.MarketData<DSL.Price>[]>("get_current_prices", { contexts }),
      "PRICES_FETCH_ERROR",
      { operation: "getCurrentPrices", contextCount: contexts.length },
    );
  }

  async getLevel1(context: DSL.DataContext): Promise<Result<DSL.MarketData<DSL.Level1>, QiError>> {
    return this.workflow(
      this.callMCPTool<DSL.MarketData<DSL.Level1>>("get_level1", { context }),
      "LEVEL1_FETCH_ERROR",
      {
        operation: "getLevel1",
        context,
      },
    );
  }

  async getMarketDepth(
    context: DSL.DataContext,
    levels: DSL.Levels,
  ): Promise<Result<DSL.MarketData<DSL.MarketDepth>, QiError>> {
    return this.workflow(
      this.callMCPTool<DSL.MarketData<DSL.MarketDepth>>("get_market_depth", { context, levels }),
      "MARKET_DEPTH_FETCH_ERROR",
      { operation: "getMarketDepth", context, levels },
    );
  }

  async getOHLCV(
    context: DSL.DataContext,
    timeframe: DSL.Timeframe,
  ): Promise<Result<DSL.MarketData<DSL.OHLCV>, QiError>> {
    return this.workflow(
      this.callMCPTool<DSL.MarketData<DSL.OHLCV>>("get_ohlcv", { context, timeframe }),
      "OHLCV_FETCH_ERROR",
      { operation: "getOHLCV", context, timeframe },
    );
  }

  async getPriceHistory(
    context: DSL.DataContext,
    range: DSL.DateRange,
  ): Promise<Result<DSL.MarketData<DSL.Price>[], QiError>> {
    return this.workflow(
      this.callMCPTool<DSL.MarketData<DSL.Price>[]>("get_price_history", { context, range }),
      "PRICE_HISTORY_FETCH_ERROR",
      { operation: "getPriceHistory", context, range },
    );
  }

  async getLevel1History(
    context: DSL.DataContext,
    range: DSL.DateRange,
  ): Promise<Result<DSL.MarketData<DSL.Level1>[], QiError>> {
    return this.workflow(
      this.callMCPTool<DSL.MarketData<DSL.Level1>[]>("get_level1_history", { context, range }),
      "LEVEL1_HISTORY_FETCH_ERROR",
      { operation: "getLevel1History", context, range },
    );
  }

  async getOHLCVHistory(
    context: DSL.DataContext,
    timeframe: DSL.Timeframe,
    range: DSL.DateRange,
  ): Promise<Result<DSL.MarketData<DSL.OHLCV>[], QiError>> {
    return this.workflow(
      this.callMCPTool<DSL.MarketData<DSL.OHLCV>[]>("get_ohlcv_history", {
        context,
        timeframe,
        range,
      }),
      "OHLCV_HISTORY_FETCH_ERROR",
      { operation: "getOHLCVHistory", context, timeframe, range },
    );
  }

  private async callMCPTool<T>(
    name: string,
    args: Record<string, unknown>,
  ): Promise<Result<T, QiError>> {
    const result = await this.callTool(name, args);
    return flatMap(
      (data) => Ok(data as T),
      result.tag === "success"
        ? Ok(result.value as T)
        : Err(
            create("MCP_TOOL_ERROR", `MCP tool call failed: ${result.error.message}`, "SYSTEM", {
              tool: name,
              args,
              originalError: result.error.message,
            }),
          ),
    );
  }
}

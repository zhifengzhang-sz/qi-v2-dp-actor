/**
 * Factory for creating MCP Market Data Readers with different transport configurations
 *
 * Simplifies the creation of MCP actors with pre-configured transports for common use cases:
 * - Twelve Data WebSocket streaming
 * - CoinGecko REST API via stdio
 * - Alpha Vantage with custom endpoints
 * - CCXT exchange integrations
 */

import type * as DSL from "@qi/dp/dsl";
import type { MCPConnectionConfig } from "./MCPBaseActor.js";
import { MCPMarketDataReader } from "./MCPMarketDataReader.js";
import type { WebSocketMCPTransportConfig } from "./WebSocketMCPTransport.js";

export interface TwelveDataConfig {
  apiKey: string;
  enableWebSocket?: boolean;
  wsUrl?: string;
  restUrl?: string;
}

export interface CoinGeckoConfig {
  apiKey?: string;
  proApi?: boolean;
}

export interface AlphaVantageConfig {
  apiKey: string;
}

export interface CCXTConfig {
  exchange: string;
  sandbox?: boolean;
  apiKey?: string;
  secret?: string;
}

/**
 * Factory class for creating MCP Market Data Readers
 */
export class MCPMarketDataReaderFactory {
  /**
   * Create Twelve Data MCP reader with WebSocket streaming support
   */
  static createTwelveDataReader(
    context: DSL.DataContext,
    config: TwelveDataConfig,
  ): MCPMarketDataReader {
    const mcpConfig: MCPConnectionConfig = config.enableWebSocket
      ? {
          type: "websocket",
          websocket: {
            url: config.wsUrl || "wss://ws.twelvedata.com/v1/quotes/price",
            headers: {
              Authorization: `Bearer ${config.apiKey}`,
            },
            reconnectAttempts: 10,
            reconnectDelay: 1000,
            maxReconnectDelay: 30000,
          },
        }
      : {
          type: "stdio",
          stdio: {
            command: "node",
            args: ["dist/bin/mcp-server.js", "--config=twelve-data", `--api-key=${config.apiKey}`],
          },
        };

    return new MCPMarketDataReader(context, mcpConfig);
  }

  /**
   * Create CoinGecko MCP reader
   */
  static createCoinGeckoReader(
    context: DSL.DataContext,
    config: CoinGeckoConfig = {},
  ): MCPMarketDataReader {
    const mcpConfig: MCPConnectionConfig = {
      type: "stdio",
      stdio: {
        command: "node",
        args: [
          "dist/bin/mcp-server.js",
          "--config=coingecko",
          ...(config.apiKey ? [`--api-key=${config.apiKey}`] : []),
          ...(config.proApi ? ["--pro-api"] : []),
        ],
      },
    };

    return new MCPMarketDataReader(context, mcpConfig);
  }

  /**
   * Create Alpha Vantage MCP reader
   */
  static createAlphaVantageReader(
    context: DSL.DataContext,
    config: AlphaVantageConfig,
  ): MCPMarketDataReader {
    const mcpConfig: MCPConnectionConfig = {
      type: "stdio",
      stdio: {
        command: "node",
        args: ["dist/bin/mcp-server.js", "--config=alpha-vantage", `--api-key=${config.apiKey}`],
      },
    };

    return new MCPMarketDataReader(context, mcpConfig);
  }

  /**
   * Create CCXT exchange MCP reader
   */
  static createCCXTReader(context: DSL.DataContext, config: CCXTConfig): MCPMarketDataReader {
    const mcpConfig: MCPConnectionConfig = {
      type: "stdio",
      stdio: {
        command: "node",
        args: [
          "dist/bin/mcp-server.js",
          "--config=ccxt",
          `--exchange=${config.exchange}`,
          ...(config.sandbox ? ["--sandbox"] : []),
          ...(config.apiKey ? [`--api-key=${config.apiKey}`] : []),
          ...(config.secret ? [`--secret=${config.secret}`] : []),
        ],
      },
    };

    return new MCPMarketDataReader(context, mcpConfig);
  }

  /**
   * Create WebSocket streaming MCP reader with custom configuration
   */
  static createWebSocketStreamingReader(
    context: DSL.DataContext,
    wsConfig: WebSocketMCPTransportConfig,
  ): MCPMarketDataReader {
    const mcpConfig: MCPConnectionConfig = {
      type: "websocket",
      websocket: wsConfig,
    };

    return new MCPMarketDataReader(context, mcpConfig);
  }

  /**
   * Create local MCP server reader (for development/testing)
   */
  static createLocalServerReader(context: DSL.DataContext, port = 8080): MCPMarketDataReader {
    const mcpConfig: MCPConnectionConfig = {
      type: "websocket",
      websocket: {
        url: `ws://localhost:${port}/mcp`,
        reconnectAttempts: 3,
        reconnectDelay: 1000,
        timeout: 5000,
      },
    };

    return new MCPMarketDataReader(context, mcpConfig);
  }

  /**
   * Create a multi-source aggregated reader (proxy pattern)
   * This creates a primary reader with fallback sources
   */
  static createAggregatedReader(
    context: DSL.DataContext,
    configs: {
      primary: TwelveDataConfig | CoinGeckoConfig | AlphaVantageConfig | CCXTConfig;
      fallbacks?: (TwelveDataConfig | CoinGeckoConfig | AlphaVantageConfig | CCXTConfig)[];
      type: "twelve-data" | "coingecko" | "alpha-vantage" | "ccxt";
    },
  ): MCPMarketDataReader {
    // For now, just return the primary reader
    // In a full implementation, this would create a proxy that manages multiple readers
    switch (configs.type) {
      case "twelve-data":
        return MCPMarketDataReaderFactory.createTwelveDataReader(
          context,
          configs.primary as TwelveDataConfig,
        );
      case "coingecko":
        return MCPMarketDataReaderFactory.createCoinGeckoReader(
          context,
          configs.primary as CoinGeckoConfig,
        );
      case "alpha-vantage":
        return MCPMarketDataReaderFactory.createAlphaVantageReader(
          context,
          configs.primary as AlphaVantageConfig,
        );
      case "ccxt":
        return MCPMarketDataReaderFactory.createCCXTReader(context, configs.primary as CCXTConfig);
      default:
        throw new Error(`Unsupported reader type: ${configs.type}`);
    }
  }
}

// Convenience functions for common use cases
export const createTwelveDataReader = MCPMarketDataReaderFactory.createTwelveDataReader;
export const createCoinGeckoReader = MCPMarketDataReaderFactory.createCoinGeckoReader;
export const createAlphaVantageReader = MCPMarketDataReaderFactory.createAlphaVantageReader;
export const createCCXTReader = MCPMarketDataReaderFactory.createCCXTReader;
export const createWebSocketStreamingReader =
  MCPMarketDataReaderFactory.createWebSocketStreamingReader;

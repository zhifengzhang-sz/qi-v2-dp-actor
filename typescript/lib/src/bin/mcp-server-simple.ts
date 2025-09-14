#!/usr/bin/env node

/**
 * Simple MCP Server for Qi DP Actor - Market Data Tools
 *
 * A basic MCP server implementation that provides market data tools
 * using the traditional setRequestHandler approach to avoid schema complexity.
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import type * as DSL from "../dsl/index.js";

interface MCPServerConfig {
  enableStreaming?: boolean;
  dataSources?: {
    twelveData?: { apiKey: string };
    coinGecko?: { apiKey?: string | undefined };
    alphaVantage?: { apiKey: string };
    ccxt?: { exchanges: string[] };
  };
}

class SimpleMCPMarketDataServer {
  private server: Server;
  private config: MCPServerConfig;
  private streamingConnections = new Map<string, any>();

  constructor(config: MCPServerConfig) {
    this.config = config;
    this.server = new Server(
      {
        name: "qi-market-data-server-simple",
        version: "ts-0.6.0",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupHandlers();
  }

  private setupHandlers() {
    // Tools list handler
    this.server.setRequestHandler("tools/list", async () => ({
      tools: [
        {
          name: "get_current_price",
          description: "Get current price for an instrument",
          inputSchema: {
            type: "object",
            properties: {
              context: {
                type: "object",
                description: "Data context with market, exchange, instrument",
              },
            },
            required: ["context"],
          },
        },
        {
          name: "get_level1",
          description: "Get Level 1 market data (best bid/ask)",
          inputSchema: {
            type: "object",
            properties: {
              context: { type: "object", description: "Data context" },
            },
            required: ["context"],
          },
        },
        {
          name: "subscribe_price_stream",
          description: "Subscribe to real-time price stream",
          inputSchema: {
            type: "object",
            properties: {
              context: { type: "object", description: "Data context" },
            },
            required: ["context"],
          },
        },
      ],
    }));

    // Tools call handler
    this.server.setRequestHandler("tools/call", async (request) => {
      const { name, arguments: args } = request.params as { name: string; arguments: any };

      switch (name) {
        case "get_current_price":
          return this.getCurrentPrice(args.context);
        case "get_level1":
          return this.getLevel1(args.context);
        case "subscribe_price_stream":
          return this.subscribePriceStream(args.context);
        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    });
  }

  // Tool implementations
  private async getCurrentPrice(context: any) {
    // Basic validation
    if (!context?.instrument?.symbol) {
      throw new Error("Invalid context: missing instrument symbol");
    }

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            symbol: context.instrument.symbol,
            price: 42000 + Math.random() * 1000,
            timestamp: new Date().toISOString(),
            source: "mock",
          }),
        },
      ],
    };
  }

  private async getLevel1(context: any) {
    if (!context?.instrument?.symbol) {
      throw new Error("Invalid context: missing instrument symbol");
    }

    const basePrice = 42000 + Math.random() * 1000;
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            symbol: context.instrument.symbol,
            bid: basePrice - 25,
            ask: basePrice + 25,
            bidSize: Math.floor(Math.random() * 100),
            askSize: Math.floor(Math.random() * 100),
            timestamp: new Date().toISOString(),
            source: "mock",
          }),
        },
      ],
    };
  }

  private async subscribePriceStream(context: any) {
    if (!context?.instrument?.symbol) {
      throw new Error("Invalid context: missing instrument symbol");
    }

    const subscriptionId = `price_${context.instrument.symbol}_${Date.now()}`;

    if (this.config.enableStreaming) {
      this.streamingConnections.set(subscriptionId, {
        type: "price",
        context,
        created: new Date(),
      });
    }

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            subscriptionId,
            status: "subscribed",
            symbol: context.instrument.symbol,
            message: "Price stream subscription created",
          }),
        },
      ],
    };
  }

  async start() {
    const transport = new StdioServerTransport();
    console.error("Simple MCP Market Data Server starting on stdio transport");

    await this.server.connect(transport);
    console.error("Simple MCP Market Data Server started successfully");
  }

  async stop() {
    // Clean up streaming connections
    this.streamingConnections.clear();
    await this.server.close();
    console.error("Simple MCP Market Data Server stopped");
  }
}

// CLI entry point
async function main() {
  const config: MCPServerConfig = {
    enableStreaming: true,
    dataSources: {
      twelveData: { apiKey: process.env["TWELVE_DATA_API_KEY"] || "" },
      coinGecko: { apiKey: process.env["COINGECKO_API_KEY"] },
      alphaVantage: { apiKey: process.env["ALPHA_VANTAGE_API_KEY"] || "" },
      ccxt: { exchanges: ["binance", "coinbase", "kraken"] },
    },
  };

  const server = new SimpleMCPMarketDataServer(config);

  // Handle graceful shutdown
  process.on("SIGINT", async () => {
    console.error("Received SIGINT, shutting down gracefully...");
    await server.stop();
    process.exit(0);
  });

  process.on("SIGTERM", async () => {
    console.error("Received SIGTERM, shutting down gracefully...");
    await server.stop();
    process.exit(0);
  });

  try {
    await server.start();
  } catch (error) {
    console.error("Failed to start MCP server:", error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { SimpleMCPMarketDataServer, type MCPServerConfig };

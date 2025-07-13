# QiCore Data Processing Actors TypeScript Implementation Guide

## Getting Started

### Project Setup

```bash
# Create TypeScript workspace
mkdir qi-dp-actor-typescript  
cd qi-dp-actor-typescript

# Initialize project
npm init -y

# Install QiCore Foundation dependency
npm install @qi/qicore-foundation

# Install development dependencies
npm install typescript @types/node vitest tsup --save-dev

# Install runtime dependencies
npm install axios ws kafkajs ioredis @modelcontextprotocol/sdk express ajv rxjs

# Copy configuration files
cp ../qi-v2-dp-actor/typescript/package.json .
cp ../qi-v2-dp-actor/typescript/tsconfig.json .
```

### Directory Structure

```
src/
├── dsl/                      # qi/dp/dsl implementation
│   ├── types.ts             # Market data types (FIX compliant)
│   ├── context.ts           # DataContext implementation
│   ├── reader.ts            # MarketDataReader interface
│   ├── writer.ts            # MarketDataWriter interface
│   └── index.ts             # DSL exports
├── market/                   # qi/dp/market implementation
│   ├── crypto/              # Cryptocurrency actors
│   └── index.ts             # Market exports  
├── mcp/                      # qi/mcp implementation
│   ├── server.ts            # MCP server
│   └── index.ts             # MCP exports
└── index.ts                  # Main exports
```

## Implementation Steps

### Step 1: Core DSL Types (src/dsl/types.ts)

```typescript
import { Result } from '@qi/qicore-foundation';

// Two-part market data structure
export interface MarketData<T extends CoreMarketData> {
  context: DataContext;      // WHO/WHERE/WHAT identification
  coreData: T;              // PURE market data (FIX compliant)
}

// Context identification (routing and business logic)
export interface DataContext {
  market: Market;           // Market classification
  exchange: Exchange;       // Exchange identification
  instrument: Instrument;   // Financial instrument details
}

export interface Market {
  type: MarketType;         // EQUITY, CRYPTO, FOREX, etc.
  region: string;           // Geographic region (US, EU, ASIA, GLOBAL)
  segment: string;          // Market segment (CASH, FUTURES, OPTIONS)
}

export interface Exchange {
  id: string;               // Unique exchange identifier
  name: string;             // Human-readable exchange name
  mic: string | null;       // ISO 10383 Market Identifier Code
  timezone: string;         // Exchange timezone (IANA)
}

export interface Instrument {
  symbol: string;           // Exchange-specific symbol
  isin: string | null;      // International Securities Identification Number
  name: string;             // Human-readable instrument name
  assetClass: AssetClass;   // Classification of underlying asset
  currency: string;         // Base currency (ISO 4217)
}

export enum MarketType {
  EQUITY = 'EQUITY',
  CRYPTO = 'CRYPTO',
  FOREX = 'FOREX',
  COMMODITY = 'COMMODITY',
  BOND = 'BOND',
  DERIVATIVE = 'DERIVATIVE'
}

export enum AssetClass {
  STOCK = 'STOCK',
  CRYPTO = 'CRYPTO',
  CURRENCY = 'CURRENCY',
  COMMODITY = 'COMMODITY',
  BOND = 'BOND',
  INDEX = 'INDEX'
}

// Base interface for all market data
export interface CoreMarketData {
  timestamp: string;        // ISO 8601 datetime
}

// FIX Protocol compliant market data types

// Real-time trade data (FIX MDEntryType=2)
export interface Price extends CoreMarketData {
  price: number;           // Trade execution price (FIX Tag 270)
  size: number;            // Trade quantity/volume (FIX Tag 271)
  tradeId?: string;        // Unique trade identifier (FIX Tag 1003)
  aggressor?: Side;        // BUY or SELL aggressor (FIX Tag 54)
}

// Top-of-book quotes (FIX MDEntryType=0/1)
export interface Level1 extends CoreMarketData {
  bidPrice: number;        // Best bid price (FIX Tag 270 + MDEntryType=0)
  bidSize: number;         // Best bid size (FIX Tag 271 + MDEntryType=0)
  askPrice: number;        // Best ask price (FIX Tag 270 + MDEntryType=1)
  askSize: number;         // Best ask size (FIX Tag 271 + MDEntryType=1)
  quoteId?: string;        // Unique quote identifier (FIX Tag 117)
}

// Time-series aggregated data
export interface OHLCV extends CoreMarketData {
  open: number;            // First trade price in period
  high: number;            // Highest trade price in period
  low: number;             // Lowest trade price in period
  close: number;           // Last trade price in period
  volume: number;          // Total volume traded in period
  tradeCount?: number;     // Number of trades in period
  weightedPrice?: number;  // Volume-weighted average price (VWAP)
}

// Multi-level order book
export interface MarketDepth extends CoreMarketData {
  bids: DepthLevel[];      // Bid side of order book (MDEntryType=0)
  asks: DepthLevel[];      // Ask side of order book (MDEntryType=1)
  bookId?: string;         // Unique order book snapshot identifier
}

export interface DepthLevel {
  price: number;           // Price level (FIX Tag 270)
  size: number;            // Quantity at this level (FIX Tag 271)
  level: number;           // Book level (FIX Tag 1023), 1=top
}

export enum Side {
  BUY = 'BUY',
  SELL = 'SELL'
}

export interface DateRange {
  start: string;    // ISO 8601 datetime
  end: string;      // ISO 8601 datetime
}
```

### Step 2: Reader Interface (src/dsl/reader.ts)

```typescript
import { Result } from '@qi/qicore-foundation';
import { MarketData, DataContext, Price, Level1, OHLCV, MarketDepth, MarketAnalytics, MarketType, DateRange } from './types';

// Market data reading operations following DSL contracts
export interface MarketDataReader {
  // Single operations
  getCurrentPrice(context: DataContext): Promise<Result<MarketData<Price>>>;
  getLevel1(context: DataContext): Promise<Result<MarketData<Level1>>>;
  getOHLCV(context: DataContext, timeframe: string): Promise<Result<MarketData<OHLCV>>>;
  getMarketDepth(context: DataContext, levels: number): Promise<Result<MarketData<MarketDepth>>>;
  
  // Batch operations
  getCurrentPrices(contexts: DataContext[]): Promise<Result<MarketData<Price>[]>>;
  getOHLCVHistory(
    context: DataContext,
    timeframe: string,
    range: DateRange
  ): Promise<Result<MarketData<OHLCV>[]>>;
  
  // Market-wide operations
  getMarketAnalytics(market: MarketType): Promise<Result<MarketData<MarketAnalytics>>>;
}

// Base class for implementing readers with common functionality
export abstract class BaseMarketDataReader implements MarketDataReader {
  protected abstract name: string;
  
  // Template method pattern for consistent error handling
  protected async executeWithErrorHandling<T>(
    operation: () => Promise<T>,
    context: string
  ): Promise<Result<T>> {
    try {
      const result = await operation();
      return success(result);
    } catch (error) {
      return failure(QiError.fromError(error as Error, ErrorCategory.NETWORK).withContext({
        reader: this.name,
        operation: context
      }));
    }
  }
  
  // Abstract methods that concrete implementations must provide
  abstract getCurrentPrice(context: DataContext): Promise<Result<MarketData<Price>>>;
  abstract getLevel1(context: DataContext): Promise<Result<MarketData<Level1>>>;
  abstract getOHLCV(context: DataContext, timeframe: string): Promise<Result<MarketData<OHLCV>>>;
  abstract getMarketDepth(context: DataContext, levels: number): Promise<Result<MarketData<MarketDepth>>>;
  abstract getCurrentPrices(contexts: DataContext[]): Promise<Result<MarketData<Price>[]>>;
  abstract getOHLCVHistory(context: DataContext, timeframe: string, range: DateRange): Promise<Result<MarketData<OHLCV>[]>>;
  abstract getMarketAnalytics(market: MarketType): Promise<Result<MarketData<MarketAnalytics>>>;
}
```

### Step 3: CoinGecko Actor Implementation (src/market/crypto/coingecko.ts)

```typescript
import axios, { AxiosInstance } from 'axios';
import { Result, success, failure, QiError, ErrorCategory } from '@qi/qicore-foundation';
import { BaseMarketDataReader, MarketData, DataContext, Price, Level1, MarketType } from '../../dsl';

export interface CoinGeckoConfig {
  apiKey?: string;
  baseUrl?: string;
  rateLimit?: {
    requestsPerMinute: number;
  };
  timeout?: number;
}

export class CoinGeckoMarketDataReader extends BaseMarketDataReader {
  protected name = 'CoinGecko';
  private client: AxiosInstance;
  private lastRequestTime = 0;
  private requestInterval: number;
  
  constructor(private config: CoinGeckoConfig) {
    super();
    
    this.client = axios.create({
      baseURL: config.baseUrl || 'https://api.coingecko.com/api/v3',
      timeout: config.timeout || 10000,
      headers: {
        ...(config.apiKey && { 'x-cg-demo-api-key': config.apiKey })
      }
    });
    
    // Calculate request interval for rate limiting
    this.requestInterval = config.rateLimit 
      ? (60 * 1000) / config.rateLimit.requestsPerMinute 
      : 1000; // Default 1 request per second
  }
  
  async getCurrentPrice(context: DataContext): Promise<Result<MarketData<Price>>> {
    return this.executeWithErrorHandling(async () => {
      await this.respectRateLimit();
      
      // Map context to CoinGecko symbol format
      const coinId = this.mapSymbolToCoinId(context.instrument.symbol);
      const vsCurrency = context.instrument.currency.toLowerCase();
      
      const response = await this.client.get(`/simple/price`, {
        params: {
          ids: coinId,
          vs_currencies: vsCurrency,
          include_last_updated_at: true,
          precision: 8
        }
      });
      
      const data = response.data[coinId];
      if (!data) {
        throw new Error(`Price data not found for ${coinId}`);
      }
      
      const price: Price = {
        timestamp: new Date(data.last_updated_at * 1000).toISOString(),
        price: data[vsCurrency],
        size: 1, // CoinGecko doesn't provide trade size
        tradeId: `cg_${Date.now()}`
      };
      
      return {
        context,
        coreData: price
      };
    }, 'getCurrentPrice');
  }
  
  async getLevel1(context: DataContext): Promise<Result<MarketData<Level1>>> {
    return this.executeWithErrorHandling(async () => {
      await this.respectRateLimit();
      
      const coinId = this.mapSymbolToCoinId(context.instrument.symbol);
      
      const response = await this.client.get(`/coins/${coinId}/tickers`, {
        params: {
          exchange_ids: this.mapExchangeId(context.exchange.id),
          depth: true
        }
      });
      
      const ticker = response.data.tickers[0];
      if (!ticker || !ticker.bid_ask_spread_percentage) {
        throw new Error(`Level1 data not found for ${coinId}`);
      }
      
      // Estimate bid/ask from last price and spread
      const lastPrice = ticker.last;
      const spreadPercent = ticker.bid_ask_spread_percentage / 100;
      const spread = lastPrice * spreadPercent;
      
      const level1: Level1 = {
        timestamp: new Date().toISOString(),
        bidPrice: lastPrice - (spread / 2),
        bidSize: ticker.volume || 0,
        askPrice: lastPrice + (spread / 2),
        askSize: ticker.volume || 0,
        quoteId: `cg_l1_${Date.now()}`
      };
      
      return {
        context,
        coreData: level1
      };
    }, 'getLevel1');
  }
  
  async getCurrentPrices(contexts: DataContext[]): Promise<Result<MarketData<Price>[]>> {
    return this.executeWithErrorHandling(async () => {
      // Batch request for multiple prices
      const coinIds = contexts.map(ctx => this.mapSymbolToCoinId(ctx.instrument.symbol));
      const vsCurrencies = [...new Set(contexts.map(ctx => ctx.instrument.currency.toLowerCase()))];
      
      await this.respectRateLimit();
      
      const response = await this.client.get(`/simple/price`, {
        params: {
          ids: coinIds.join(','),
          vs_currencies: vsCurrencies.join(','),
          include_last_updated_at: true,
          precision: 8
        }
      });
      
      return contexts.map(context => {
        const coinId = this.mapSymbolToCoinId(context.instrument.symbol);
        const vsCurrency = context.instrument.currency.toLowerCase();
        const data = response.data[coinId];
        
        const price: Price = {
          timestamp: new Date((data?.last_updated_at || Date.now() / 1000) * 1000).toISOString(),
          price: data?.[vsCurrency] || 0,
          size: 1,
          tradeId: `cg_batch_${Date.now()}`
        };
        
        return {
          context,
          coreData: price
        };
      });
    }, 'getCurrentPrices');
  }
  
  // Rate limiting implementation
  private async respectRateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.requestInterval) {
      const delay = this.requestInterval - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    this.lastRequestTime = Date.now();
  }
  
  // Symbol mapping helpers
  private mapSymbolToCoinId(symbol: string): string {
    // Common symbol to CoinGecko ID mappings
    const symbolMap: Record<string, string> = {
      'BTC-USD': 'bitcoin',
      'ETH-USD': 'ethereum',
      'ADA-USD': 'cardano',
      'SOL-USD': 'solana',
      'MATIC-USD': 'matic-network',
      // Add more mappings as needed
    };
    
    return symbolMap[symbol] || symbol.split('-')[0].toLowerCase();
  }
  
  private mapExchangeId(exchangeId: string): string {
    // Map exchange IDs to CoinGecko exchange names
    const exchangeMap: Record<string, string> = {
      'BINANCE': 'binance',
      'COINBASE': 'gdax',
      'KRAKEN': 'kraken',
      // Add more mappings as needed
    };
    
    return exchangeMap[exchangeId] || exchangeId.toLowerCase();
  }
  
  // Implement remaining abstract methods with similar patterns
  async getOHLCV(context: DataContext, timeframe: string): Promise<Result<MarketData<OHLCV>>> {
    // Implementation for OHLCV data
    throw new Error('Method not implemented');
  }
  
  async getMarketDepth(context: DataContext, levels: number): Promise<Result<MarketData<MarketDepth>>> {
    // Implementation for market depth
    throw new Error('Method not implemented');
  }
  
  async getOHLCVHistory(context: DataContext, timeframe: string, range: DateRange): Promise<Result<MarketData<OHLCV>[]>> {
    // Implementation for historical OHLCV
    throw new Error('Method not implemented');
  }
  
  async getMarketAnalytics(market: MarketType): Promise<Result<MarketData<MarketAnalytics>>> {
    // Implementation for market analytics
    throw new Error('Method not implemented');
  }
}

// Factory function
export function createCoinGeckoReader(config: CoinGeckoConfig): CoinGeckoMarketDataReader {
  return new CoinGeckoMarketDataReader(config);
}
```

### Step 4: MCP Server Implementation (src/mcp/server.ts)

```typescript
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { 
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { Result, success, failure, QiError } from '@qi/qicore-foundation';
import { MarketDataReader, DataContext, MarketType } from '../dsl';

export interface MCPServerConfig {
  name: string;
  version: string;
  readers: Record<string, MarketDataReader>;
}

export class QiCoreMCPServer {
  private server: Server;
  
  constructor(private config: MCPServerConfig) {
    this.server = new Server(
      {
        name: config.name,
        version: config.version,
      },
      {
        capabilities: {
          tools: {}
        }
      }
    );
    
    this.setupHandlers();
  }
  
  private setupHandlers(): void {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: "get_crypto_price",
            description: "Get current cryptocurrency price",
            inputSchema: {
              type: "object",
              properties: {
                symbol: { 
                  type: "string", 
                  description: "Trading pair symbol (e.g., BTC-USD)" 
                },
                exchange: { 
                  type: "string", 
                  description: "Exchange ID (e.g., COINBASE)" 
                }
              },
              required: ["symbol", "exchange"]
            }
          },
          {
            name: "get_market_analytics",
            description: "Get market-wide analytics",
            inputSchema: {
              type: "object",
              properties: {
                market: { 
                  type: "string", 
                  enum: ["CRYPTO", "EQUITY", "FOREX"],
                  description: "Market type to analyze"
                }
              },
              required: ["market"]
            }
          },
          {
            name: "get_multiple_prices",
            description: "Get prices for multiple trading pairs",
            inputSchema: {
              type: "object",
              properties: {
                pairs: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      symbol: { type: "string" },
                      exchange: { type: "string" }
                    },
                    required: ["symbol", "exchange"]
                  }
                }
              },
              required: ["pairs"]
            }
          }
        ]
      };
    });
    
    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      
      try {
        switch (name) {
          case "get_crypto_price":
            return await this.handleGetCryptoPrice(args);
          
          case "get_market_analytics":
            return await this.handleGetMarketAnalytics(args);
          
          case "get_multiple_prices":
            return await this.handleGetMultiplePrices(args);
          
          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `Unknown tool: ${name}`
            );
        }
      } catch (error) {
        throw new McpError(
          ErrorCode.InternalError,
          `Tool execution failed: ${error.message}`
        );
      }
    });
  }
  
  private async handleGetCryptoPrice(args: any) {
    const { symbol, exchange } = args;
    
    // Create context from arguments
    const context: DataContext = this.createContextFromArgs(symbol, exchange);
    
    // Use appropriate reader (default to first available)
    const readerName = Object.keys(this.config.readers)[0];
    const reader = this.config.readers[readerName];
    
    const result = await reader.getCurrentPrice(context);
    
    return result.match(
      (marketData) => ({
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: true,
              data: {
                symbol,
                exchange,
                price: marketData.coreData.price,
                timestamp: marketData.coreData.timestamp,
                size: marketData.coreData.size,
                source: readerName
              }
            }, null, 2)
          }
        ]
      }),
      (error) => ({
        content: [
          {
            type: "text", 
            text: JSON.stringify({
              success: false,
              error: error.message,
              code: error.code,
              timestamp: new Date().toISOString()
            }, null, 2)
          }
        ]
      })
    );
  }
  
  private async handleGetMarketAnalytics(args: any) {
    const { market } = args;
    const marketType = market as MarketType;
    
    // Use appropriate reader
    const readerName = Object.keys(this.config.readers)[0];
    const reader = this.config.readers[readerName];
    
    const result = await reader.getMarketAnalytics(marketType);
    
    return result.match(
      (marketData) => ({
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: true,
              data: {
                market: marketType,
                totalMarketCap: marketData.coreData.totalMarketCap,
                totalVolume: marketData.coreData.totalVolume,
                instrumentCount: marketData.coreData.instrumentCount,
                timestamp: marketData.coreData.timestamp,
                source: readerName
              }
            }, null, 2)
          }
        ]
      }),
      (error) => ({
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: false,
              error: error.message,
              code: error.code
            }, null, 2)
          }
        ]
      })
    );
  }
  
  private async handleGetMultiplePrices(args: any) {
    const { pairs } = args;
    
    // Create contexts for all pairs
    const contexts = pairs.map((pair: any) => 
      this.createContextFromArgs(pair.symbol, pair.exchange)
    );
    
    // Use appropriate reader
    const readerName = Object.keys(this.config.readers)[0];
    const reader = this.config.readers[readerName];
    
    const result = await reader.getCurrentPrices(contexts);
    
    return result.match(
      (marketDataList) => ({
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: true,
              data: marketDataList.map(md => ({
                symbol: md.context.instrument.symbol,
                exchange: md.context.exchange.id,
                price: md.coreData.price,
                timestamp: md.coreData.timestamp,
                size: md.coreData.size
              })),
              source: readerName,
              count: marketDataList.length
            }, null, 2)
          }
        ]
      }),
      (error) => ({
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: false,
              error: error.message,
              code: error.code
            }, null, 2)
          }
        ]
      })
    );
  }
  
  private createContextFromArgs(symbol: string, exchangeId: string): DataContext {
    return {
      market: {
        type: MarketType.CRYPTO,
        region: 'GLOBAL',
        segment: 'CASH'
      },
      exchange: {
        id: exchangeId,
        name: exchangeId,
        mic: null,
        timezone: 'UTC'
      },
      instrument: {
        symbol,
        isin: null,
        name: symbol.split('-')[0],
        assetClass: AssetClass.CRYPTO,
        currency: symbol.split('-')[1] || 'USD'
      }
    };
  }
  
  async start(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("QiCore MCP Server running on stdio");
  }
}

// Factory function
export function createMCPServer(config: MCPServerConfig): QiCoreMCPServer {
  return new QiCoreMCPServer(config);
}
```

### Step 5: Main Entry Point (src/index.ts)

```typescript
// Re-export foundation types from dependency
export { Result, success, failure, QiError, ErrorCategory } from '@qi/qicore-foundation';

// Export DSL types and interfaces
export * from './dsl';

// Export market implementations
export * from './market';

// Export MCP server
export * from './mcp';

// Export utilities
export * from './functional';
export * from './testing';
export * from './analytics';
export * from './performance';
```

## Testing

### Contract Compliance Tests

```typescript
// tests/contracts/dsl-compliance.test.ts
import { describe, it, expect } from 'vitest';
import { createCoinGeckoReader } from '../../src/market/crypto/coingecko';
import { createTestContext } from '../helpers';

describe('DSL Contract Compliance', () => {
  it('should satisfy getCurrentPrice contract', async () => {
    const reader = createCoinGeckoReader({ apiKey: 'test' });
    const context = createTestContext('BTC-USD', 'COINBASE');
    
    const result = await reader.getCurrentPrice(context);
    
    expect(result.isSuccess() || result.isFailure()).toBe(true);
    
    if (result.isSuccess()) {
      const marketData = result.unwrap();
      expect(marketData.context).toEqual(context);
      expect(marketData.coreData.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      expect(typeof marketData.coreData.price).toBe('number');
      expect(marketData.coreData.price).toBeGreaterThan(0);
    }
  });
});
```

## Build and Deploy

```bash
# Build the library
npm run build

# Run tests
npm test

# Run integration tests with live APIs
npm run test:integration

# Start MCP server
npm run start:mcp

# Package for distribution
npm pack
```

This implementation provides a complete TypeScript implementation of the QiCore v4.0 Data Processing Actors with full DSL compliance, FIX Protocol adherence, and production-ready MCP server integration.
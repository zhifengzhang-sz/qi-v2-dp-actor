# Concrete Actor Implementations Design

## Overview

This document defines the design and implementation requirements for concrete actors in the QiCore Data Processing Actor system. These actors provide specific implementations of the abstract base classes to integrate with real-world data sources, storage systems, and external services.

## Actor Categories

### 1. HTTP-based Data Source Actors

HTTP-based actors handle REST API integrations for market data retrieval.

#### Base HTTP Reader Pattern

```typescript
import { Reader } from '../abstract/Reader.js';
import type { DataContext, MarketData, Price, Level1, OHLCV, Result } from '../../dsl/index.js';

export abstract class HTTPReader extends Reader {
  protected httpClient: HTTPClient;
  protected rateLimiter: RateLimiter;
  protected cache: LRUCache<string, any>;
  
  constructor(config: HTTPReaderConfig) {
    super();
    this.httpClient = new HTTPClient({
      baseURL: config.baseURL,
      timeout: config.timeout || 30000,
      retries: config.retries || 3,
      headers: config.defaultHeaders
    });
    
    this.rateLimiter = new RateLimiter({
      maxRequests: config.rateLimit.maxRequests,
      windowMs: config.rateLimit.windowMs
    });
    
    this.cache = new LRUCache({
      max: config.cacheSize || 1000,
      ttl: config.cacheTTL || 60000 // 1 minute default
    });
  }
  
  protected async makeRequest<T>(
    endpoint: string,
    params?: Record<string, any>
  ): Promise<Result<T>> {
    return this.rateLimiter.execute(async () => {
      const cacheKey = this.buildCacheKey(endpoint, params);
      const cached = this.cache.get(cacheKey);
      
      if (cached) {
        return Ok(cached);
      }
      
      try {
        const response = await this.httpClient.get<T>(endpoint, { params });
        this.cache.set(cacheKey, response.data);
        return Ok(response.data);
      } catch (error) {
        return this.handleHTTPError(error);
      }
    });
  }
  
  protected abstract transformToPrice(data: any, context: DataContext): Result<Price>;
  protected abstract transformToLevel1(data: any, context: DataContext): Result<Level1>;
  protected abstract transformToOHLCV(data: any, context: DataContext): Result<OHLCV>;
}
```

#### CoinGecko Reader Implementation

```typescript
export class CoinGeckoReader extends HTTPReader {
  constructor(config: CoinGeckoConfig) {
    super({
      baseURL: 'https://api.coingecko.com/api/v3',
      rateLimit: {
        maxRequests: config.tier === 'pro' ? 500 : 50,
        windowMs: 60000 // per minute
      },
      defaultHeaders: config.apiKey ? {
        'x-cg-pro-api-key': config.apiKey
      } : undefined,
      ...config
    });
  }
  
  async getCurrentPrice(context: DataContext): Promise<Result<MarketData<Price>>> {
    const coinId = this.mapSymbolToCoinId(context.instrument.symbol);
    const currency = context.instrument.currency.toLowerCase();
    
    const response = await this.makeRequest<CoinGeckoSimplePrice>(
      '/simple/price',
      {
        ids: coinId,
        vs_currencies: currency,
        include_market_cap: true,
        include_24hr_vol: true,
        include_24hr_change: true,
        include_last_updated_at: true
      }
    );
    
    return response.flatMap(data => {
      const coinData = data[coinId];
      if (!coinData) {
        return Err(create(
          'COIN_NOT_FOUND',
          `Coin ${coinId} not found in CoinGecko response`,
          'DATA',
          { coinId, currency }
        ));
      }
      
      return this.transformToPrice(coinData, context).map(price => ({
        context,
        coreData: price
      }));
    });
  }
  
  async getOHLCV(
    context: DataContext,
    timeframe: string = '1d'
  ): Promise<Result<MarketData<OHLCV>>> {
    const coinId = this.mapSymbolToCoinId(context.instrument.symbol);
    const currency = context.instrument.currency.toLowerCase();
    const days = this.mapTimeframeToDays(timeframe);
    
    const response = await this.makeRequest<number[][]>(
      `/coins/${coinId}/ohlc`,
      {
        vs_currency: currency,
        days: days
      }
    );
    
    return response.flatMap(data => {
      if (!data || data.length === 0) {
        return Err(create(
          'NO_OHLC_DATA',
          `No OHLC data available for ${coinId}`,
          'DATA',
          { coinId, currency, days }
        ));
      }
      
      // Get the latest OHLC data point
      const latest = data[data.length - 1];
      return this.transformToOHLCV(latest, context).map(ohlcv => ({
        context,
        coreData: ohlcv
      }));
    });
  }
  
  async getMarketAnalytics(market: MarketType): Promise<Result<MarketData<MarketAnalytics>>> {
    if (market !== MarketType.CRYPTO) {
      return Err(create(
        'UNSUPPORTED_MARKET',
        'CoinGecko only supports cryptocurrency market analytics',
        'VALIDATION',
        { market }
      ));
    }
    
    const response = await this.makeRequest<CoinGeckoGlobalData>('/global');
    
    return response.flatMap(data => {
      return this.transformToMarketAnalytics(data.data).map(analytics => ({
        context: this.createGlobalMarketContext(),
        coreData: analytics
      }));
    });
  }
  
  protected transformToPrice(data: CoinGeckoPriceData, context: DataContext): Result<Price> {
    return Price.create(
      new Date(data.last_updated_at * 1000).toISOString(),
      data[context.instrument.currency.toLowerCase()].toString(),
      data[`${context.instrument.currency.toLowerCase()}_24h_vol`]?.toString() || "0",
      undefined, // tradeId
      undefined  // aggressor
    );
  }
  
  protected transformToOHLCV(data: number[], context: DataContext): Result<OHLCV> {
    const [timestamp, open, high, low, close] = data;
    
    return OHLCV.create(
      new Date(timestamp).toISOString(),
      open.toString(),
      high.toString(),
      low.toString(),
      close.toString(),
      "0" // Volume not provided in OHLC endpoint
    );
  }
  
  private mapSymbolToCoinId(symbol: string): string {
    // Map trading symbols to CoinGecko coin IDs
    const symbolMap: Record<string, string> = {
      'BTC-USD': 'bitcoin',
      'BTC/USD': 'bitcoin',
      'BTCUSD': 'bitcoin',
      'ETH-USD': 'ethereum',
      'ETH/USD': 'ethereum',
      'ETHUSD': 'ethereum',
      // Add more mappings as needed
    };
    
    return symbolMap[symbol] || symbol.toLowerCase().split(/[-\/]/)[0];
  }
  
  private mapTimeframeToDays(timeframe: string): number {
    const timeframeMap: Record<string, number> = {
      '1d': 1,
      '7d': 7,
      '30d': 30,
      '90d': 90,
      '180d': 180,
      '365d': 365,
      'max': 365
    };
    
    return timeframeMap[timeframe] || 1;
  }
}
```

#### Binance Reader Implementation

```typescript
export class BinanceReader extends HTTPReader {
  private exchangeInfo: BinanceExchangeInfo | null = null;
  
  constructor(config: BinanceConfig) {
    super({
      baseURL: config.testnet ? 
        'https://testnet.binance.vision/api/v3' : 
        'https://api.binance.com/api/v3',
      rateLimit: {
        maxRequests: 1200, // Binance weight limit
        windowMs: 60000
      },
      ...config
    });
  }
  
  async initialize(): Promise<Result<void>> {
    // Load exchange info on startup
    const infoResult = await this.makeRequest<BinanceExchangeInfo>('/exchangeInfo');
    
    return infoResult.match(
      info => {
        this.exchangeInfo = info;
        return Ok(undefined);
      },
      error => Err(error)
    );
  }
  
  async getCurrentPrice(context: DataContext): Promise<Result<MarketData<Price>>> {
    const symbol = this.normalizeSymbol(context.instrument.symbol);
    
    const response = await this.makeRequest<BinanceTickerPrice>(
      '/ticker/price',
      { symbol }
    );
    
    return response.flatMap(data => {
      return this.transformToPrice(data, context).map(price => ({
        context,
        coreData: price
      }));
    });
  }
  
  async getLevel1(context: DataContext): Promise<Result<MarketData<Level1>>> {
    const symbol = this.normalizeSymbol(context.instrument.symbol);
    
    const response = await this.makeRequest<BinanceOrderBook>(
      '/depth',
      { symbol, limit: 1 }
    );
    
    return response.flatMap(data => {
      return this.transformToLevel1(data, context).map(level1 => ({
        context,
        coreData: level1
      }));
    });
  }
  
  async getOHLCV(
    context: DataContext,
    timeframe: string = '1h'
  ): Promise<Result<MarketData<OHLCV>>> {
    const symbol = this.normalizeSymbol(context.instrument.symbol);
    const interval = this.mapTimeframeToInterval(timeframe);
    
    const response = await this.makeRequest<BinanceKline[]>(
      '/klines',
      {
        symbol,
        interval,
        limit: 1 // Get only the latest complete candle
      }
    );
    
    return response.flatMap(data => {
      if (!data || data.length === 0) {
        return Err(create(
          'NO_KLINE_DATA',
          `No kline data available for ${symbol}`,
          'DATA',
          { symbol, interval }
        ));
      }
      
      return this.transformToOHLCV(data[0], context).map(ohlcv => ({
        context,
        coreData: ohlcv
      }));
    });
  }
  
  protected transformToPrice(data: BinanceTickerPrice, context: DataContext): Result<Price> {
    return Price.create(
      new Date().toISOString(), // Binance doesn't provide timestamp in ticker/price
      data.price,
      "0", // Size not available in ticker/price endpoint
      undefined,
      undefined
    );
  }
  
  protected transformToLevel1(data: BinanceOrderBook, context: DataContext): Result<Level1> {
    const bestBid = data.bids[0];
    const bestAsk = data.asks[0];
    
    if (!bestBid || !bestAsk) {
      return Err(create(
        'INVALID_ORDER_BOOK',
        'Order book missing bid or ask data',
        'DATA',
        { bids: data.bids.length, asks: data.asks.length }
      ));
    }
    
    return Level1.create(
      new Date().toISOString(),
      bestBid[0], // price
      bestBid[1], // quantity
      bestAsk[0], // price
      bestAsk[1]  // quantity
    );
  }
  
  protected transformToOHLCV(data: BinanceKline, context: DataContext): Result<OHLCV> {
    const [
      openTime,
      open,
      high,
      low,
      close,
      volume,
      closeTime,
      quoteAssetVolume,
      numberOfTrades,
      takerBuyBaseAssetVolume,
      takerBuyQuoteAssetVolume,
      ignore
    ] = data;
    
    return OHLCV.create(
      new Date(openTime).toISOString(),
      open,
      high,
      low,
      close,
      volume
    );
  }
  
  private normalizeSymbol(symbol: string): string {
    // Convert various symbol formats to Binance format (e.g., BTCUSDT)
    return symbol
      .replace(/[-\/]/g, '')
      .toUpperCase();
  }
  
  private mapTimeframeToInterval(timeframe: string): string {
    const intervalMap: Record<string, string> = {
      '1s': '1s',
      '1m': '1m',
      '3m': '3m',
      '5m': '5m',
      '15m': '15m',
      '30m': '30m',
      '1h': '1h',
      '2h': '2h',
      '4h': '4h',
      '6h': '6h',
      '8h': '8h',
      '12h': '12h',
      '1d': '1d',
      '3d': '3d',
      '1w': '1w',
      '1M': '1M'
    };
    
    return intervalMap[timeframe] || '1h';
  }
}
```

### 2. WebSocket Streaming Actors

#### Base WebSocket Streaming Pattern

```typescript
import { StreamingReader } from '../abstract/StreamingReader.js';
import type { MarketDataStream, StreamingConfig } from '../../dsl/index.js';

export abstract class WebSocketStreamingReader extends StreamingReader {
  protected ws: WebSocket | null = null;
  protected reconnectAttempts = 0;
  protected maxReconnectAttempts = 5;
  protected reconnectDelay = 1000;
  protected heartbeatInterval: NodeJS.Timeout | null = null;
  
  constructor(protected config: WebSocketStreamingConfig) {
    super();
  }
  
  async connect(): Promise<Result<void>> {
    return new Promise((resolve) => {
      try {
        this.ws = new WebSocket(this.buildWebSocketURL());
        
        this.ws.onopen = () => {
          console.log('WebSocket connected');
          this.reconnectAttempts = 0;
          this.startHeartbeat();
          this.sendSubscriptions();
          resolve(Ok(undefined));
        };
        
        this.ws.onmessage = (event) => {
          this.handleMessage(event.data);
        };
        
        this.ws.onclose = (event) => {
          console.log('WebSocket closed:', event.code, event.reason);
          this.cleanup();
          
          if (!event.wasClean && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.scheduleReconnect();
          }
        };
        
        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          resolve(Err(create(
            'WEBSOCKET_ERROR',
            'Failed to connect to WebSocket',
            'NETWORK',
            { error }
          )));
        };
      } catch (error) {
        resolve(Err(create(
          'WEBSOCKET_CONNECTION_FAILED',
          'Failed to create WebSocket connection',
          'NETWORK',
          { error }
        )));
      }
    });
  }
  
  async disconnect(): Promise<Result<void>> {
    this.cleanup();
    
    if (this.ws) {
      this.ws.close(1000, 'Normal closure');
      this.ws = null;
    }
    
    return Ok(undefined);
  }
  
  protected abstract buildWebSocketURL(): string;
  protected abstract sendSubscriptions(): void;
  protected abstract handleMessage(data: string): void;
  protected abstract parseMessage(data: any): MarketData<any> | null;
  
  private scheduleReconnect(): void {
    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    setTimeout(() => {
      console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      this.connect();
    }, delay);
  }
  
  private startHeartbeat(): void {
    if (this.config.heartbeatInterval) {
      this.heartbeatInterval = setInterval(() => {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          this.sendHeartbeat();
        }
      }, this.config.heartbeatInterval);
    }
  }
  
  private cleanup(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }
  
  protected sendHeartbeat(): void {
    // Default implementation - override in subclasses if needed
    if (this.ws) {
      this.ws.ping();
    }
  }
}
```

#### Binance WebSocket Stream Implementation

```typescript
export class BinanceStreamingReader extends WebSocketStreamingReader {
  private subscriptions: Set<string> = new Set();
  
  constructor(config: BinanceStreamingConfig) {
    super({
      ...config,
      heartbeatInterval: 180000 // 3 minutes
    });
  }
  
  protected buildWebSocketURL(): string {
    const baseURL = this.config.testnet ? 
      'wss://testnet.binance.vision/ws' : 
      'wss://stream.binance.com:9443/ws';
      
    // Create combined stream URL
    const streams = this.buildStreamNames();
    return `${baseURL}/${streams.join('/')}`;
  }
  
  protected sendSubscriptions(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    
    const streams = this.buildStreamNames();
    
    const subscribeMessage = {
      method: 'SUBSCRIBE',
      params: streams,
      id: Date.now()
    };
    
    this.ws.send(JSON.stringify(subscribeMessage));
  }
  
  protected handleMessage(data: string): void {
    try {
      const message = JSON.parse(data);
      
      // Handle subscription responses
      if (message.result === null && message.id) {
        console.log('Subscription confirmed:', message.id);
        return;
      }
      
      // Handle stream data
      const marketData = this.parseMessage(message);
      if (marketData) {
        this.emit('data', marketData);
      }
    } catch (error) {
      console.error('Error parsing WebSocket message:', error);
    }
  }
  
  protected parseMessage(data: any): MarketData<any> | null {
    if (!data.stream || !data.data) return null;
    
    const streamType = this.getStreamType(data.stream);
    
    switch (streamType) {
      case 'ticker':
        return this.parseTicker(data.data, data.stream);
      case 'trade':
        return this.parseTrade(data.data, data.stream);
      case 'depth':
        return this.parseDepth(data.data, data.stream);
      case 'kline':
        return this.parseKline(data.data, data.stream);
      default:
        return null;
    }
  }
  
  private parseTicker(data: BinanceTickerData, stream: string): MarketData<Level1> | null {
    const symbol = this.extractSymbolFromStream(stream);
    const context = this.createContextForSymbol(symbol);
    
    const level1Result = Level1.create(
      new Date(data.E).toISOString(), // Event time
      data.b, // Best bid price
      data.B, // Best bid quantity
      data.a, // Best ask price
      data.A  // Best ask quantity
    );
    
    return level1Result.match(
      level1 => ({ context, coreData: level1 }),
      error => {
        console.error('Error creating Level1 data:', error.message);
        return null;
      }
    );
  }
  
  private parseTrade(data: BinanceTradeData, stream: string): MarketData<Price> | null {
    const symbol = this.extractSymbolFromStream(stream);
    const context = this.createContextForSymbol(symbol);
    
    const priceResult = Price.create(
      new Date(data.T).toISOString(), // Trade time
      data.p, // Price
      data.q, // Quantity
      data.t.toString(), // Trade ID
      data.m ? 'SELL' : 'BUY' // Buyer is maker (sell) or taker (buy)
    );
    
    return priceResult.match(
      price => ({ context, coreData: price }),
      error => {
        console.error('Error creating Price data:', error.message);
        return null;
      }
    );
  }
  
  private parseKline(data: BinanceKlineData, stream: string): MarketData<OHLCV> | null {
    const symbol = this.extractSymbolFromStream(stream);
    const context = this.createContextForSymbol(symbol);
    
    // Only process closed klines
    if (!data.k.x) return null;
    
    const ohlcvResult = OHLCV.create(
      new Date(data.k.t).toISOString(), // Kline start time
      data.k.o, // Open price
      data.k.h, // High price
      data.k.l, // Low price
      data.k.c, // Close price
      data.k.v  // Volume
    );
    
    return ohlcvResult.match(
      ohlcv => ({ context, coreData: ohlcv }),
      error => {
        console.error('Error creating OHLCV data:', error.message);
        return null;
      }
    );
  }
  
  private buildStreamNames(): string[] {
    const streams: string[] = [];
    
    for (const symbol of this.config.symbols) {
      const normalizedSymbol = symbol.toLowerCase();
      
      if (this.config.dataTypes.includes('ticker')) {
        streams.push(`${normalizedSymbol}@ticker`);
      }
      
      if (this.config.dataTypes.includes('trade')) {
        streams.push(`${normalizedSymbol}@trade`);
      }
      
      if (this.config.dataTypes.includes('depth')) {
        streams.push(`${normalizedSymbol}@depth`);
      }
      
      if (this.config.dataTypes.includes('kline')) {
        const interval = this.config.klineInterval || '1m';
        streams.push(`${normalizedSymbol}@kline_${interval}`);
      }
    }
    
    return streams;
  }
  
  private getStreamType(stream: string): string {
    if (stream.includes('@ticker')) return 'ticker';
    if (stream.includes('@trade')) return 'trade';
    if (stream.includes('@depth')) return 'depth';
    if (stream.includes('@kline')) return 'kline';
    return 'unknown';
  }
  
  private extractSymbolFromStream(stream: string): string {
    return stream.split('@')[0].toUpperCase();
  }
  
  private createContextForSymbol(symbol: string): DataContext {
    // Create appropriate DataContext for the symbol
    // This would typically be configured or derived from exchange info
    return {
      market: {
        type: 'CRYPTO',
        region: 'GLOBAL',
        segment: 'CASH'
      },
      exchange: {
        id: 'BINANCE',
        name: 'Binance',
        mic: null,
        timezone: 'UTC'
      },
      instrument: {
        symbol: symbol,
        isin: null,
        name: symbol.replace('USDT', ''),
        assetClass: 'CRYPTO',
        currency: symbol.endsWith('USDT') ? 'USDT' : 'USD'
      }
    };
  }
}
```

### 3. Database Storage Actors

#### TimescaleDB Writer Implementation

```typescript
import { Writer } from '../abstract/Writer.js';
import { Pool, PoolClient } from 'pg';
import type { MarketData, Price, Level1, OHLCV, MarketDepth } from '../../dsl/index.js';

export class TimescaleDBWriter extends Writer {
  private pool: Pool;
  private initialized = false;
  
  constructor(private config: TimescaleDBConfig) {
    super();
    this.pool = new Pool({
      host: config.host,
      port: config.port || 5432,
      database: config.database,
      user: config.username,
      password: config.password,
      ssl: config.ssl,
      max: config.maxConnections || 20,
      idleTimeoutMillis: config.idleTimeoutMs || 30000,
      connectionTimeoutMillis: config.connectionTimeoutMs || 10000
    });
  }
  
  async initialize(): Promise<Result<void>> {
    if (this.initialized) return Ok(undefined);
    
    try {
      // Create tables if they don't exist
      await this.createTables();
      await this.createHypertables();
      await this.createIndexes();
      await this.setupCompressionPolicies();
      
      this.initialized = true;
      return Ok(undefined);
    } catch (error) {
      return Err(create(
        'TIMESCALE_INIT_ERROR',
        'Failed to initialize TimescaleDB',
        'SYSTEM',
        { error }
      ));
    }
  }
  
  async publishPrice(data: MarketData<Price>): Promise<Result<void>> {
    const query = `
      INSERT INTO prices (
        timestamp, exchange_id, symbol, price, size, trade_id, aggressor,
        market_type, region, segment, asset_class, currency
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      ON CONFLICT (timestamp, exchange_id, symbol, trade_id) DO UPDATE SET
        price = EXCLUDED.price,
        size = EXCLUDED.size,
        aggressor = EXCLUDED.aggressor
    `;
    
    const values = [
      data.coreData.timestamp,
      data.context.exchange.id,
      data.context.instrument.symbol,
      parseFloat(data.coreData.price),
      parseFloat(data.coreData.size),
      data.coreData.tradeId,
      data.coreData.aggressor,
      data.context.market.type,
      data.context.market.region,
      data.context.market.segment,
      data.context.instrument.assetClass,
      data.context.instrument.currency
    ];
    
    return this.executeQuery(query, values);
  }
  
  async publishLevel1(data: MarketData<Level1>): Promise<Result<void>> {
    const query = `
      INSERT INTO level1 (
        timestamp, exchange_id, symbol, 
        bid_price, bid_size, ask_price, ask_size,
        market_type, region, segment, asset_class, currency
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      ON CONFLICT (timestamp, exchange_id, symbol) DO UPDATE SET
        bid_price = EXCLUDED.bid_price,
        bid_size = EXCLUDED.bid_size,
        ask_price = EXCLUDED.ask_price,
        ask_size = EXCLUDED.ask_size
    `;
    
    const values = [
      data.coreData.timestamp,
      data.context.exchange.id,
      data.context.instrument.symbol,
      parseFloat(data.coreData.bidPrice),
      parseFloat(data.coreData.bidSize),
      parseFloat(data.coreData.askPrice),
      parseFloat(data.coreData.askSize),
      data.context.market.type,
      data.context.market.region,
      data.context.market.segment,
      data.context.instrument.assetClass,
      data.context.instrument.currency
    ];
    
    return this.executeQuery(query, values);
  }
  
  async publishOHLCV(data: MarketData<OHLCV>): Promise<Result<void>> {
    const query = `
      INSERT INTO ohlcv (
        timestamp, exchange_id, symbol,
        open, high, low, close, volume,
        market_type, region, segment, asset_class, currency
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      ON CONFLICT (timestamp, exchange_id, symbol) DO UPDATE SET
        open = EXCLUDED.open,
        high = EXCLUDED.high,
        low = EXCLUDED.low,
        close = EXCLUDED.close,
        volume = EXCLUDED.volume
    `;
    
    const values = [
      data.coreData.timestamp,
      data.context.exchange.id,
      data.context.instrument.symbol,
      parseFloat(data.coreData.open),
      parseFloat(data.coreData.high),
      parseFloat(data.coreData.low),
      parseFloat(data.coreData.close),
      parseFloat(data.coreData.volume),
      data.context.market.type,
      data.context.market.region,
      data.context.market.segment,
      data.context.instrument.assetClass,
      data.context.instrument.currency
    ];
    
    return this.executeQuery(query, values);
  }
  
  async publishPrices(data: MarketData<Price>[]): Promise<Result<void>> {
    if (data.length === 0) return Ok(undefined);
    
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      for (const priceData of data) {
        const result = await this.publishPrice(priceData);
        if (result.isErr()) {
          await client.query('ROLLBACK');
          return result;
        }
      }
      
      await client.query('COMMIT');
      return Ok(undefined);
    } catch (error) {
      await client.query('ROLLBACK');
      return Err(create(
        'BATCH_INSERT_ERROR',
        'Failed to insert batch of price data',
        'SYSTEM',
        { error, batchSize: data.length }
      ));
    } finally {
      client.release();
    }
  }
  
  private async executeQuery(query: string, values: any[]): Promise<Result<void>> {
    try {
      await this.pool.query(query, values);
      return Ok(undefined);
    } catch (error) {
      return Err(create(
        'QUERY_EXECUTION_ERROR',
        'Failed to execute database query',
        'SYSTEM',
        { error, query: query.substring(0, 100) }
      ));
    }
  }
  
  private async createTables(): Promise<void> {
    const tables = [
      `
      CREATE TABLE IF NOT EXISTS prices (
        timestamp TIMESTAMPTZ NOT NULL,
        exchange_id VARCHAR(50) NOT NULL,
        symbol VARCHAR(50) NOT NULL,
        price DECIMAL(20,8) NOT NULL,
        size DECIMAL(20,8) NOT NULL,
        trade_id VARCHAR(100),
        aggressor VARCHAR(10),
        market_type VARCHAR(20) NOT NULL,
        region VARCHAR(20) NOT NULL,
        segment VARCHAR(20) NOT NULL,
        asset_class VARCHAR(20) NOT NULL,
        currency VARCHAR(10) NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
      `,
      `
      CREATE TABLE IF NOT EXISTS level1 (
        timestamp TIMESTAMPTZ NOT NULL,
        exchange_id VARCHAR(50) NOT NULL,
        symbol VARCHAR(50) NOT NULL,
        bid_price DECIMAL(20,8) NOT NULL,
        bid_size DECIMAL(20,8) NOT NULL,
        ask_price DECIMAL(20,8) NOT NULL,
        ask_size DECIMAL(20,8) NOT NULL,
        market_type VARCHAR(20) NOT NULL,
        region VARCHAR(20) NOT NULL,
        segment VARCHAR(20) NOT NULL,
        asset_class VARCHAR(20) NOT NULL,
        currency VARCHAR(10) NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
      `,
      `
      CREATE TABLE IF NOT EXISTS ohlcv (
        timestamp TIMESTAMPTZ NOT NULL,
        exchange_id VARCHAR(50) NOT NULL,
        symbol VARCHAR(50) NOT NULL,
        open DECIMAL(20,8) NOT NULL,
        high DECIMAL(20,8) NOT NULL,
        low DECIMAL(20,8) NOT NULL,
        close DECIMAL(20,8) NOT NULL,
        volume DECIMAL(20,8) NOT NULL,
        market_type VARCHAR(20) NOT NULL,
        region VARCHAR(20) NOT NULL,
        segment VARCHAR(20) NOT NULL,
        asset_class VARCHAR(20) NOT NULL,
        currency VARCHAR(10) NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
      `
    ];
    
    for (const tableSQL of tables) {
      await this.pool.query(tableSQL);
    }
  }
  
  private async createHypertables(): Promise<void> {
    const hypertables = [
      "SELECT create_hypertable('prices', 'timestamp', if_not_exists => TRUE)",
      "SELECT create_hypertable('level1', 'timestamp', if_not_exists => TRUE)",
      "SELECT create_hypertable('ohlcv', 'timestamp', if_not_exists => TRUE)"
    ];
    
    for (const sql of hypertables) {
      try {
        await this.pool.query(sql);
      } catch (error) {
        // Hypertable might already exist
        console.warn('Hypertable creation warning:', error);
      }
    }
  }
  
  private async createIndexes(): Promise<void> {
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_prices_symbol_timestamp ON prices (symbol, timestamp DESC)',
      'CREATE INDEX IF NOT EXISTS idx_prices_exchange_symbol ON prices (exchange_id, symbol)',
      'CREATE INDEX IF NOT EXISTS idx_level1_symbol_timestamp ON level1 (symbol, timestamp DESC)',
      'CREATE INDEX IF NOT EXISTS idx_level1_exchange_symbol ON level1 (exchange_id, symbol)',
      'CREATE INDEX IF NOT EXISTS idx_ohlcv_symbol_timestamp ON ohlcv (symbol, timestamp DESC)',
      'CREATE INDEX IF NOT EXISTS idx_ohlcv_exchange_symbol ON ohlcv (exchange_id, symbol)'
    ];
    
    for (const indexSQL of indexes) {
      await this.pool.query(indexSQL);
    }
  }
  
  private async setupCompressionPolicies(): Promise<void> {
    const compressionPolicies = [
      "SELECT add_compression_policy('prices', INTERVAL '7 days', if_not_exists => TRUE)",
      "SELECT add_compression_policy('level1', INTERVAL '1 day', if_not_exists => TRUE)",
      "SELECT add_compression_policy('ohlcv', INTERVAL '30 days', if_not_exists => TRUE)"
    ];
    
    for (const policy of compressionPolicies) {
      try {
        await this.pool.query(policy);
      } catch (error) {
        console.warn('Compression policy warning:', error);
      }
    }
  }
  
  async cleanup(): Promise<Result<void>> {
    try {
      await this.pool.end();
      return Ok(undefined);
    } catch (error) {
      return Err(create(
        'CLEANUP_ERROR',
        'Failed to cleanup TimescaleDB connection pool',
        'SYSTEM',
        { error }
      ));
    }
  }
}
```

This design provides comprehensive concrete implementations for the most critical actor types needed to build a complete trading system on top of the qi-v2-dp-actor foundation.
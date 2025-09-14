/**
 * WebSocket transport for MCP client connections
 *
 * Provides WebSocket-based transport for MCP protocol with:
 * - Auto-reconnection capabilities
 * - Connection pooling
 * - Real-time streaming support
 * - Error handling and recovery
 */

import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import type { Result } from "@qi/base";
import { Err, Ok, create } from "@qi/base";
import { WebSocket } from "ws";

export interface WebSocketMCPTransportConfig {
  url: string;
  reconnectAttempts?: number;
  reconnectDelay?: number;
  maxReconnectDelay?: number;
  timeout?: number;
  headers?: Record<string, string>;
}

export class WebSocketMCPTransport implements Transport {
  private ws: WebSocket | null = null;
  private config: Required<WebSocketMCPTransportConfig>;
  private messageHandlers = new Map<string, (message: any) => void>();
  private errorHandlers = new Set<(error: Error) => void>();
  private closeHandlers = new Set<() => void>();
  private reconnectTimer: NodeJS.Timeout | null = null;
  private currentReconnectDelay: number;
  private reconnectAttemptCount = 0;
  private isClosedIntentionally = false;

  constructor(config: WebSocketMCPTransportConfig) {
    this.config = {
      reconnectAttempts: 5,
      reconnectDelay: 1000,
      maxReconnectDelay: 30000,
      timeout: 10000,
      headers: {},
      ...config,
    };
    this.currentReconnectDelay = this.config.reconnectDelay;
  }

  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.config.url, {
          headers: this.config.headers,
          handshakeTimeout: this.config.timeout,
        });

        const timeout = setTimeout(() => {
          if (this.ws?.readyState !== WebSocket.OPEN) {
            reject(new Error(`WebSocket connection timeout after ${this.config.timeout}ms`));
            this.ws?.close();
          }
        }, this.config.timeout);

        this.ws.on("open", () => {
          clearTimeout(timeout);
          this.reconnectAttemptCount = 0;
          this.currentReconnectDelay = this.config.reconnectDelay;
          resolve();
        });

        this.ws.on("message", (data) => {
          try {
            const message = JSON.parse(data.toString());
            // Route message to appropriate handler based on message type/id
            const handler = this.messageHandlers.get(message.id) || this.messageHandlers.get("*");
            if (handler) {
              handler(message);
            }
          } catch (error) {
            const parseError = error instanceof Error ? error : new Error(String(error));
            this.errorHandlers.forEach((handler) => handler(parseError));
          }
        });

        this.ws.on("error", (error) => {
          clearTimeout(timeout);
          this.errorHandlers.forEach((handler) => handler(error));
          if (!this.isClosedIntentionally) {
            this.scheduleReconnect();
          }
        });

        this.ws.on("close", (code, reason) => {
          clearTimeout(timeout);
          this.ws = null;

          if (!this.isClosedIntentionally && code !== 1000) {
            // Unexpected close, attempt reconnection
            this.scheduleReconnect();
          }

          this.closeHandlers.forEach((handler) => handler());
        });
      } catch (error) {
        reject(error instanceof Error ? error : new Error(String(error)));
      }
    });
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttemptCount >= this.config.reconnectAttempts) {
      const maxAttemptsError = new Error(
        `Maximum reconnection attempts (${this.config.reconnectAttempts}) reached`
      );
      this.errorHandlers.forEach((handler) => handler(maxAttemptsError));
      return;
    }

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    this.reconnectTimer = setTimeout(async () => {
      this.reconnectAttemptCount++;

      try {
        await this.start();
      } catch (error) {
        // Exponential backoff with jitter
        this.currentReconnectDelay = Math.min(
          this.currentReconnectDelay * 2 + Math.random() * 1000,
          this.config.maxReconnectDelay
        );

        if (this.reconnectAttemptCount < this.config.reconnectAttempts) {
          this.scheduleReconnect();
        }
      }
    }, this.currentReconnectDelay);
  }

  async send(message: any): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        reject(new Error("WebSocket not connected"));
        return;
      }

      try {
        const data = typeof message === "string" ? message : JSON.stringify(message);
        this.ws.send(data, (error) => {
          if (error) {
            reject(error);
          } else {
            resolve();
          }
        });
      } catch (error) {
        reject(error instanceof Error ? error : new Error(String(error)));
      }
    });
  }

  onMessage(handler: (message: any) => void): void {
    this.messageHandlers.set("*", handler);
  }

  onError(handler: (error: Error) => void): void {
    this.errorHandlers.add(handler);
  }

  onClose(handler: () => void): void {
    this.closeHandlers.add(handler);
  }

  async close(): Promise<void> {
    this.isClosedIntentionally = true;

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      return new Promise((resolve) => {
        const timeout = setTimeout(() => {
          resolve(); // Force resolve after timeout
        }, 5000);

        this.ws!.on("close", () => {
          clearTimeout(timeout);
          resolve();
        });

        this.ws!.close(1000, "Client closing");
      });
    }
  }

  // Connection status helpers
  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  get connectionState(): string {
    if (!this.ws) return "DISCONNECTED";

    switch (this.ws.readyState) {
      case WebSocket.CONNECTING:
        return "CONNECTING";
      case WebSocket.OPEN:
        return "OPEN";
      case WebSocket.CLOSING:
        return "CLOSING";
      case WebSocket.CLOSED:
        return "CLOSED";
      default:
        return "UNKNOWN";
    }
  }

  // Streaming helpers
  subscribeToMessages(messageType: string, handler: (message: any) => void): void {
    this.messageHandlers.set(messageType, handler);
  }

  unsubscribeFromMessages(messageType: string): void {
    this.messageHandlers.delete(messageType);
  }
}

/**
 * Factory function to create WebSocket MCP transport with common configurations
 */
export function createWebSocketTransport(
  config: WebSocketMCPTransportConfig
): WebSocketMCPTransport {
  return new WebSocketMCPTransport(config);
}

/**
 * Create WebSocket transport for streaming market data
 */
export function createStreamingTransport(
  serverUrl: string,
  options?: Partial<WebSocketMCPTransportConfig>
): WebSocketMCPTransport {
  return new WebSocketMCPTransport({
    url: serverUrl,
    reconnectAttempts: 10, // More aggressive reconnection for streaming
    reconnectDelay: 500, // Faster initial reconnection
    maxReconnectDelay: 10000, // Cap at 10s for streaming
    timeout: 5000, // Shorter timeout for streaming
    ...options,
  });
}

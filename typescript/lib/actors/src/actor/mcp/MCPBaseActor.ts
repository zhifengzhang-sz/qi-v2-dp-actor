import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import type { Result } from "@qi/base";
import { Err, Ok } from "@qi/base";
import type * as DSL from "../../dsl";
import { BaseActor } from "../abstract/BaseActor";
import { WebSocketMCPTransport, type WebSocketMCPTransportConfig } from "./WebSocketMCPTransport";

export interface MCPConnectionConfig {
  type: "stdio" | "websocket";
  stdio?: {
    command: string;
    args?: string[];
  };
  websocket?: WebSocketMCPTransportConfig;
}

/**
 * Base class for all MCP actors providing MCP client infrastructure
 *
 * This class handles the MCP client lifecycle and hides MCP protocol details.
 * Concrete classes implement DSL contracts using MCP tools.
 *
 * Supports both stdio and WebSocket transports for maximum flexibility:
 * - Stdio: Traditional command-line MCP servers
 * - WebSocket: Real-time streaming MCP servers with auto-reconnection
 */
export abstract class MCPBaseActor extends BaseActor {
  protected client: Client;
  protected transport: Transport | null = null;
  protected isConnected = false;
  protected config: MCPConnectionConfig;

  constructor(context: DSL.DataContext, config: MCPConnectionConfig) {
    super(context);
    this.config = config;

    this.client = new Client(
      {
        name: "qi-dp-actor",
        version: "ts-0.7.0-dev",
      },
      {
        capabilities: {
          sampling: {},
        },
      }
    );

    this.initializeTransport();
  }

  // Legacy constructor for backwards compatibility
  static createWithCommand(context: DSL.DataContext, serverCommand: string[]): MCPBaseActor {
    const config: MCPConnectionConfig = {
      type: "stdio",
      stdio: {
        command: serverCommand[0] || "",
        args: serverCommand.slice(1),
      },
    };

    // This is abstract, so we can't instantiate directly
    // This method should be overridden by concrete classes
    throw new Error("createWithCommand must be overridden by concrete classes");
  }

  private initializeTransport(): void {
    if (this.config.type === "websocket" && this.config.websocket) {
      this.transport = new WebSocketMCPTransport(this.config.websocket);
    } else if (this.config.type === "stdio" && this.config.stdio) {
      this.transport = new StdioClientTransport({
        command: this.config.stdio.command,
        args: this.config.stdio.args || [],
      });
    } else {
      throw new Error(`Invalid MCP configuration: ${JSON.stringify(this.config)}`);
    }
  }

  /**
   * Connect to MCP server with auto-retry for WebSocket connections
   */
  async connect(): Promise<Result<void, Error>> {
    try {
      if (!this.transport) {
        return Err(new Error("Transport not initialized"));
      }

      // For WebSocket transport, start the connection
      if (this.transport instanceof WebSocketMCPTransport) {
        await this.transport.start();
      }

      await this.client.connect(this.transport);
      this.isConnected = true;
      return Ok(undefined);
    } catch (error) {
      this.isConnected = false;
      return Err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Disconnect from MCP server
   */
  async disconnect(): Promise<Result<void, Error>> {
    try {
      if (this.transport && this.isConnected) {
        await this.transport.close();
        this.isConnected = false;
      }
      return Ok(undefined);
    } catch (error) {
      return Err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Get connection status including transport-specific information
   */
  getConnectionInfo(): {
    isConnected: boolean;
    transportType: string;
    transportState?: string | undefined;
  } {
    return {
      isConnected: this.isConnected,
      transportType: this.config.type,
      transportState:
        this.transport instanceof WebSocketMCPTransport
          ? this.transport.connectionState
          : undefined,
    };
  }

  /**
   * Call a tool on the MCP server
   */
  protected async callTool(name: string, args: any): Promise<Result<any, Error>> {
    try {
      if (!this.isConnected) {
        await this.connect();
      }

      const result = await this.client.callTool({
        name,
        arguments: args,
      });

      return Ok(result);
    } catch (error) {
      return Err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * List available tools from the MCP server
   */
  protected async listTools(): Promise<Result<any[], Error>> {
    try {
      if (!this.isConnected) {
        await this.connect();
      }

      const result = await this.client.listTools();
      return Ok(result.tools || []);
    } catch (error) {
      return Err(error instanceof Error ? error : new Error(String(error)));
    }
  }
}

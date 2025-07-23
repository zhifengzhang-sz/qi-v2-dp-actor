import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import type { Result } from "@qi/base";
import { Err, Ok } from "@qi/base";
import type * as DSL from "../../dsl";
import { BaseActor } from "../abstract/BaseActor";

/**
 * Base class for all MCP actors providing MCP client infrastructure
 *
 * This class handles the MCP client lifecycle and hides MCP protocol details.
 * Concrete classes implement DSL contracts using MCP tools.
 */
export abstract class MCPBaseActor extends BaseActor {
  protected client: Client;
  protected transport: StdioClientTransport | null = null;
  protected isConnected = false;

  constructor(context: DSL.DataContext, serverCommand: string[]) {
    super(context);
    this.client = new Client(
      {
        name: "qi-dp-actor",
        version: "ts-0.5.1",
      },
      {
        capabilities: {},
      }
    );
    this.transport = new StdioClientTransport({
      command: serverCommand[0] || "",
      args: serverCommand.slice(1),
    });
  }

  /**
   * Connect to MCP server
   */
  async connect(): Promise<Result<void, Error>> {
    try {
      if (this.transport) {
        await this.client.connect(this.transport);
        this.isConnected = true;
      }
      return Ok(undefined);
    } catch (error) {
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

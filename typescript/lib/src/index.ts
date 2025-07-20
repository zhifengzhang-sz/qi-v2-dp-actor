/**
 * QiCore v4.0 Data Processing Actors - Main Entry Point
 * TypeScript implementation of market data DSL and actor system
 */

// Export DSL implementation
export * from "./dsl/index.js";

// Export utilities (analytics moved here from DSL for architectural separation)
export * as Utils from "./utils/index.js";

// TODO: Export market layer when implemented
// export * from "./market/index.js";

// TODO: Export MCP layer when implemented
// export * from "./mcp/index.js";

// TODO: Export functional utilities when implemented
// export * from "./functional/index.js";

// TODO: Export performance utilities when implemented
// export * from "./performance/index.js";

// TODO: Export testing utilities when implemented
// export * from "./testing/index.js";

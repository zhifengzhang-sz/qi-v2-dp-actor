/**
 * QiCore Data Processing Actor - Main exports
 *
 * Re-exports all modules for unified access while maintaining
 * the ability to import specific modules independently.
 */

// Re-export all DSL types for backward compatibility
export * from "../dsl/src/index.js";

// Re-export all MD smart constructors for backward compatibility
export * as MD from "../md/src/index.js";

// Re-export all utils for backward compatibility
export * as Utils from "../utils/src/index.js";

// Re-export actors (when integration is complete)
export * as Actors from "../actors/src/index.js";

// Re-export connectors (when KafkaJS integration is complete)
export * as Connectors from "../connectors/src/index.js";

// Note: Individual module imports are preferred:
// import { Price } from "@qi/dp-actor/dsl"
// import { Price as PriceConstructor } from "@qi/dp-actor/md"
// import { Analytics } from "@qi/dp-actor/utils"

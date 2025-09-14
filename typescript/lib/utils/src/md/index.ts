/**
 * MD Layer Utilities - Market Data Implementation Layer
 *
 * This module provides implementation utilities for the Market Data DSL:
 * - Analytics: Business intelligence for market data
 * - Precision: Financial arithmetic with decimal.js
 * - Validation: Runtime validation for DSL types
 * - Errors: Domain-specific error factories
 */

// Export analytics module
export type * from "./analytics/index.js";
export * from "./analytics/index.js";

// Export precision module
export * from "./precision/index.js";

// Validation removed - not the responsibility of utils layer

// Export error utilities
export * from "./errors.js";

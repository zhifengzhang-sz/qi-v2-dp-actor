/**
 * Utility functions for analytics creation and manipulation
 * Implements: docs/utils/md/analytics.md Wrapper Pattern and Utilities
 */

import { Err, Ok } from "@qi/base";
import type { QiError, Result } from "@qi/base";
import type { DataContext } from "@qi/dp/dsl";
import { createMarketDataError } from "../errors.js";
import type { AnalyticsMarketData, MarketAnalytics } from "./types.js";
import { isValidMarketAnalytics } from "./validation.js";

/**
 * Creates a validated AnalyticsMarketData wrapper
 * Since analytics are no longer part of CoreMarketData, this wrapper maintains DSL structure consistency
 *
 * @param context DataContext with market, exchange, and instrument information
 * @param analytics Validated MarketAnalytics data
 * @returns Result<AnalyticsMarketData> with validation
 */
export function createAnalyticsMarketData(
  context: DataContext,
  analytics: MarketAnalytics
): Result<AnalyticsMarketData, QiError> {
  // Validate context
  if (!context || typeof context !== "object") {
    return Err(
      createMarketDataError(
        "INVALID_CONTEXT",
        "Context must be a valid DataContext object",
        "VALIDATION",
        {
          value: context,
          error: typeof context,
        }
      )
    );
  }

  // Validate analytics
  if (!isValidMarketAnalytics(analytics)) {
    return Err(
      createMarketDataError("INVALID_ANALYTICS", "Analytics data failed validation", "VALIDATION", {
        value: analytics,
      })
    );
  }

  const analyticsData: AnalyticsMarketData = {
    context,
    coreData: analytics,
  };

  return Ok(analyticsData);
}

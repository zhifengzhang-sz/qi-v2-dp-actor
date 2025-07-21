/**
 * Utility functions for analytics creation and manipulation
 * Implements: docs/utils/md/analytics.md Wrapper Pattern and Utilities
 */

import { failure, success } from "@qi/base";
import type { Result } from "@qi/base";
import type { DataContext } from "../../../dsl/index.js";
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
): Result<AnalyticsMarketData, any> {
  // Validate context
  if (!context || typeof context !== "object") {
    return failure(
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
    return failure(
      createMarketDataError("INVALID_ANALYTICS", "Analytics data failed validation", "VALIDATION", {
        value: analytics,
      })
    );
  }

  const analyticsData: AnalyticsMarketData = {
    context,
    coreData: analytics,
  };

  return success(analyticsData);
}

/**
 * Unit tests for DSL types and analytics validation
 * Focus on analytics types that belong in utils layer
 */

import { describe, expect, it } from "vitest";

// Import analytics types from utils
import {
  type ChangeMetrics,
  type DominanceMetrics,
  type VolatilityMetrics,
  isValidChangeMetrics,
  isValidDominanceMetrics,
  isValidVolatilityMetrics,
} from "@qi/dp/utils";

describe("DSL Types - Analytics Validation", () => {
  describe("DominanceMetrics", () => {
    it("should validate valid dominance metrics", () => {
      const validMetrics: DominanceMetrics[] = [
        {
          topInstrumentShare: 45.5,
          top5InstrumentShare: 78.2,
          top10InstrumentShare: 89.9,
          exchangeConcentration: 0.15,
        },
        {
          topInstrumentShare: 0,
          top5InstrumentShare: 0,
          top10InstrumentShare: 0,
          exchangeConcentration: 0,
        }, // zero values
        {
          topInstrumentShare: 100,
          top5InstrumentShare: 100,
          top10InstrumentShare: 100,
          exchangeConcentration: 1,
        }, // maximum values
      ];

      for (const metrics of validMetrics) {
        expect(isValidDominanceMetrics(metrics)).toBe(true);
      }
    });

    it("should reject invalid dominance metrics", () => {
      const invalidMetrics = [
        null,
        undefined,
        {},
        {
          topInstrumentShare: -1, // negative percentage
          top5InstrumentShare: 50,
          top10InstrumentShare: 75,
          exchangeConcentration: 0.5,
        },
        {
          topInstrumentShare: 101, // > 100%
          top5InstrumentShare: 50,
          top10InstrumentShare: 75,
          exchangeConcentration: 0.5,
        },
        {
          topInstrumentShare: 25,
          top5InstrumentShare: 50,
          top10InstrumentShare: 75,
          exchangeConcentration: -0.1, // negative concentration
        },
        {
          topInstrumentShare: 25,
          top5InstrumentShare: 50,
          top10InstrumentShare: 75,
          exchangeConcentration: 1.1, // > 1
        },
      ];

      for (const metrics of invalidMetrics) {
        expect(isValidDominanceMetrics(metrics)).toBe(false);
      }
    });
  });

  describe("ChangeMetrics", () => {
    it("should validate valid change metrics", () => {
      const validMetrics: ChangeMetrics[] = [
        {
          change1h: 0.5,
          change24h: -2.1,
          change7d: 15.3,
          change30d: -8.7,
          changeYTD: 123.4,
        },
        {
          change1h: 0,
          change24h: 0,
          change7d: 0,
          change30d: 0,
          changeYTD: 0,
        }, // zero changes
        {
          change1h: -100,
          change24h: -100,
          change7d: -100,
          change30d: -100,
        }, // large negative changes
      ];

      for (const metrics of validMetrics) {
        expect(isValidChangeMetrics(metrics)).toBe(true);
      }
    });

    it("should reject invalid change metrics", () => {
      const invalidMetrics = [
        null,
        undefined,
        {},
        {
          change1h: Number.NaN, // NaN values
          change24h: 5,
          change7d: 10,
          change30d: -2,
        },
        {
          change1h: Number.POSITIVE_INFINITY, // Infinity values
          change24h: 5,
          change7d: 10,
          change30d: -2,
        },
      ];

      for (const metrics of invalidMetrics) {
        expect(isValidChangeMetrics(metrics)).toBe(false);
      }
    });
  });

  describe("VolatilityMetrics", () => {
    it("should validate valid volatility metrics", () => {
      const validMetrics: VolatilityMetrics[] = [
        {
          volatility24h: 0.045,
          volatility7d: 0.032,
          volatility30d: 0.028,
          averageTrueRange: 125.5,
          betaToMarket: 1.15,
        },
        {
          volatility24h: 0,
          volatility7d: 0,
          volatility30d: 0,
        }, // minimum values
      ];

      for (const metrics of validMetrics) {
        expect(isValidVolatilityMetrics(metrics)).toBe(true);
      }
    });

    it("should reject invalid volatility metrics", () => {
      const invalidMetrics = [
        null,
        undefined,
        {},
        {
          volatility24h: -0.1, // negative volatility
          volatility7d: 0.05,
          volatility30d: 0.03,
        },
        {
          volatility24h: Number.NaN, // NaN
          volatility7d: 0.05,
          volatility30d: 0.03,
        },
        {
          volatility24h: Number.POSITIVE_INFINITY, // Infinity
          volatility7d: 0.05,
          volatility30d: 0.03,
        },
      ];

      for (const metrics of invalidMetrics) {
        expect(isValidVolatilityMetrics(metrics)).toBe(false);
      }
    });
  });
});

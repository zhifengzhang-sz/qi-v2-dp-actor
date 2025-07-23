/**
 * Tests for Market smart constructor
 * Uses real market data examples - no mocks or stubs
 */

import { getError, getValue, isFailure, isSuccess } from "@qi/base";
import { describe, expect, it } from "vitest";
import type * as DSL from "../../src/dsl/index.js";
import { Market } from "../../src/md/market.js";

describe("Market Smart Constructor", () => {
  describe("create() method", () => {
    it("should create valid equity cash market", () => {
      const result = Market.create("EQUITY", "US", "CASH");

      expect(isSuccess(result)).toBe(true);
      const market = getValue(result);
      expect(market.type).toBe("EQUITY");
      expect(market.region).toBe("US");
      expect(market.segment).toBe("CASH");
    });

    it("should create valid crypto market", () => {
      const result = Market.create("CRYPTO", "US", "CASH");

      expect(isSuccess(result)).toBe(true);
      const market = getValue(result);
      expect(market.type).toBe("CRYPTO");
      expect(market.region).toBe("US");
      expect(market.segment).toBe("CASH");
    });

    it("should create valid markets for all types", () => {
      const marketTypes: DSL.MarketType[] = [
        "EQUITY",
        "CRYPTO",
        "FOREX",
        "COMMODITY",
        "BOND",
        "DERIVATIVE",
      ];

      for (const type of marketTypes) {
        const result = Market.create(type, "US", "CASH");
        expect(isSuccess(result)).toBe(true);
        const market = getValue(result);
        expect(market.type).toBe(type);
      }
    });

    it("should create valid markets for all segments", () => {
      const segments: DSL.Segment[] = ["CASH", "FUTURES", "OPTIONS"];

      for (const segment of segments) {
        const result = Market.create("EQUITY", "US", segment);
        expect(isSuccess(result)).toBe(true);
        const market = getValue(result);
        expect(market.segment).toBe(segment);
      }
    });

    it("should create valid markets for major global regions", () => {
      const globalMarkets = [
        { type: "EQUITY" as DSL.MarketType, region: "US", segment: "CASH" as DSL.Segment },
        { type: "EQUITY" as DSL.MarketType, region: "GB", segment: "CASH" as DSL.Segment },
        { type: "EQUITY" as DSL.MarketType, region: "JP", segment: "CASH" as DSL.Segment },
        { type: "EQUITY" as DSL.MarketType, region: "DE", segment: "CASH" as DSL.Segment },
        { type: "EQUITY" as DSL.MarketType, region: "FR", segment: "CASH" as DSL.Segment },
        { type: "EQUITY" as DSL.MarketType, region: "CA", segment: "CASH" as DSL.Segment },
        { type: "EQUITY" as DSL.MarketType, region: "AU", segment: "CASH" as DSL.Segment },
        { type: "EQUITY" as DSL.MarketType, region: "HK", segment: "CASH" as DSL.Segment },
        { type: "FOREX" as DSL.MarketType, region: "US", segment: "CASH" as DSL.Segment },
        { type: "CRYPTO" as DSL.MarketType, region: "US", segment: "CASH" as DSL.Segment },
      ];

      for (const market of globalMarkets) {
        const result = Market.create(market.type, market.region, market.segment);
        expect(isSuccess(result)).toBe(true);
        const marketInstance = getValue(result);
        expect(marketInstance.type).toBe(market.type);
        expect(marketInstance.region).toBe(market.region);
        expect(marketInstance.segment).toBe(market.segment);
      }
    });

    it("should create valid derivatives markets", () => {
      const derivativeMarkets = [
        { type: "COMMODITY" as DSL.MarketType, region: "US", segment: "FUTURES" as DSL.Segment },
        { type: "EQUITY" as DSL.MarketType, region: "US", segment: "OPTIONS" as DSL.Segment },
        { type: "DERIVATIVE" as DSL.MarketType, region: "US", segment: "FUTURES" as DSL.Segment },
        { type: "DERIVATIVE" as DSL.MarketType, region: "GB", segment: "OPTIONS" as DSL.Segment },
      ];

      for (const market of derivativeMarkets) {
        const result = Market.create(market.type, market.region, market.segment);
        expect(isSuccess(result)).toBe(true);
        const marketInstance = getValue(result);
        expect(marketInstance.isDerivatives()).toBe(true);
      }
    });

    describe("market type validation", () => {
      it("should accept all valid market types", () => {
        const validTypes: DSL.MarketType[] = [
          "EQUITY",
          "CRYPTO",
          "FOREX",
          "COMMODITY",
          "BOND",
          "DERIVATIVE",
        ];

        for (const type of validTypes) {
          const result = Market.create(type, "US", "CASH");
          expect(isSuccess(result)).toBe(true);
        }
      });

      it("should reject invalid market type", () => {
        const result = Market.create("INVALID" as any, "US", "CASH");

        expect(isFailure(result)).toBe(true);
        const error = getError(result);
        expect(error.code).toBe("INVALID_MARKET_TYPE");
        expect(error.message).toContain(
          "Market type must be one of: EQUITY, CRYPTO, FOREX, COMMODITY, BOND, DERIVATIVE"
        );
        expect(error.context?.validValues).toEqual([
          "EQUITY",
          "CRYPTO",
          "FOREX",
          "COMMODITY",
          "BOND",
          "DERIVATIVE",
        ]);
      });

      it("should reject null market type", () => {
        const result = Market.create(null as any, "US", "CASH");

        expect(isFailure(result)).toBe(true);
        const error = getError(result);
        expect(error.code).toBe("INVALID_MARKET_TYPE");
      });

      it("should reject lowercase market type", () => {
        const result = Market.create("equity" as any, "US", "CASH");

        expect(isFailure(result)).toBe(true);
        const error = getError(result);
        expect(error.code).toBe("INVALID_MARKET_TYPE");
      });
    });

    describe("region validation", () => {
      it("should accept valid ISO 3166-1 alpha-2 country codes", () => {
        const validRegions = [
          "US",
          "GB",
          "JP",
          "DE",
          "FR",
          "CA",
          "AU",
          "CH",
          "HK",
          "SG",
          "IN",
          "BR",
          "CN",
          "KR",
        ];

        for (const region of validRegions) {
          const result = Market.create("EQUITY", region, "CASH");
          expect(isSuccess(result)).toBe(true);
          const marketInstance = getValue(result);
          expect(marketInstance.region).toBe(region);
        }
      });

      it("should accept valid region codes", () => {
        const result = Market.create("FOREX", "US", "CASH");

        expect(isSuccess(result)).toBe(true);
        const marketInstance = getValue(result);
        expect(marketInstance.region).toBe("US");
      });

      it("should reject empty string region", () => {
        const result = Market.create("EQUITY", "", "CASH");

        expect(isFailure(result)).toBe(true);
        const error = getError(result);
        expect(error.code).toBe("INVALID_STRING_EMPTY");
        expect(error.context?.field).toBe("region");
      });

      it("should reject null region", () => {
        const result = Market.create("EQUITY", null as any, "CASH");

        expect(isFailure(result)).toBe(true);
        const error = getError(result);
        expect(error.code).toBe("INVALID_STRING_TYPE");
        expect(error.context?.field).toBe("region");
      });

      it("should reject non-string region", () => {
        const result = Market.create("EQUITY", 123 as any, "CASH");

        expect(isFailure(result)).toBe(true);
        const error = getError(result);
        expect(error.code).toBe("INVALID_STRING_TYPE");
      });

      it("should reject invalid region format", () => {
        const invalidRegions = ["usa", "U", "USD", "123", "us", "U1"];

        for (const region of invalidRegions) {
          const result = Market.create("EQUITY", region, "CASH");
          expect(isFailure(result)).toBe(true);
          const error = getError(result);
          expect(error.code).toBe("INVALID_REGION_FORMAT");
          expect(error.message).toContain(
            "Region must be a 2-letter ISO 3166-1 alpha-2 country code"
          );
          expect(error.context?.expectedFormat).toBe("XX (two uppercase letters)");
        }
      });
    });

    describe("segment validation", () => {
      it("should accept all valid segments", () => {
        const validSegments: DSL.Segment[] = ["CASH", "FUTURES", "OPTIONS"];

        for (const segment of validSegments) {
          const result = Market.create("EQUITY", "US", segment);
          expect(isSuccess(result)).toBe(true);
          const marketInstance = getValue(result);
          expect(marketInstance.segment).toBe(segment);
        }
      });

      it("should reject invalid segment", () => {
        const result = Market.create("EQUITY", "US", "INVALID" as any);

        expect(isFailure(result)).toBe(true);
        const error = getError(result);
        expect(error.code).toBe("INVALID_SEGMENT");
        expect(error.message).toContain("Market segment must be one of: CASH, FUTURES, OPTIONS");
        expect(error.context?.validValues).toEqual(["CASH", "FUTURES", "OPTIONS"]);
      });

      it("should reject null segment", () => {
        const result = Market.create("EQUITY", "US", null as any);

        expect(isFailure(result)).toBe(true);
        const error = getError(result);
        expect(error.code).toBe("INVALID_SEGMENT");
      });

      it("should reject lowercase segment", () => {
        const result = Market.create("EQUITY", "US", "cash" as any);

        expect(isFailure(result)).toBe(true);
        const error = getError(result);
        expect(error.code).toBe("INVALID_SEGMENT");
      });
    });
  });

  describe("fromDSL() method", () => {
    it("should create Market from valid DSL Market object", () => {
      const dslMarket: DSL.Market = {
        type: "EQUITY",
        region: "GB",
        segment: "CASH",
      };

      const result = Market.fromDSL(dslMarket);

      expect(isSuccess(result)).toBe(true);
      const marketInstance = getValue(result);
      expect(marketInstance.type).toBe("EQUITY");
      expect(marketInstance.region).toBe("GB");
      expect(marketInstance.segment).toBe("CASH");
    });

    it("should create Market from DSL derivatives object", () => {
      const dslMarket: DSL.Market = {
        type: "COMMODITY",
        region: "US",
        segment: "FUTURES",
      };

      const result = Market.fromDSL(dslMarket);

      expect(isSuccess(result)).toBe(true);
      const marketInstance = getValue(result);
      expect(marketInstance.type).toBe("COMMODITY");
      expect(marketInstance.segment).toBe("FUTURES");
      expect(marketInstance.isDerivatives()).toBe(true);
    });

    it("should fail validation for invalid DSL Market object", () => {
      const invalidDslMarket = {
        type: "INVALID",
        region: "invalid",
        segment: "INVALID",
      } as DSL.Market;

      const result = Market.fromDSL(invalidDslMarket);

      expect(isFailure(result)).toBe(true);
      const error = getError(result);
      expect(error.code).toBe("INVALID_MARKET_TYPE");
    });
  });

  describe("market type methods", () => {
    it("should correctly identify equity market", () => {
      const result = Market.create("EQUITY", "US", "CASH");
      expect(isSuccess(result)).toBe(true);

      const marketInstance = getValue(result);
      expect(marketInstance.isEquity()).toBe(true);
      expect(marketInstance.isCrypto()).toBe(false);
      expect(marketInstance.isForex()).toBe(false);
    });

    it("should correctly identify crypto market", () => {
      const result = Market.create("CRYPTO", "US", "CASH");
      expect(isSuccess(result)).toBe(true);

      const marketInstance = getValue(result);
      expect(marketInstance.isCrypto()).toBe(true);
      expect(marketInstance.isEquity()).toBe(false);
      expect(marketInstance.isForex()).toBe(false);
    });

    it("should correctly identify forex market", () => {
      const result = Market.create("FOREX", "US", "CASH");
      expect(isSuccess(result)).toBe(true);

      const marketInstance = getValue(result);
      expect(marketInstance.isForex()).toBe(true);
      expect(marketInstance.isEquity()).toBe(false);
      expect(marketInstance.isCrypto()).toBe(false);
    });

    it("should correctly identify all market types", () => {
      const marketTests = [
        { type: "EQUITY" as DSL.MarketType, method: "isEquity" as const },
        { type: "CRYPTO" as DSL.MarketType, method: "isCrypto" as const },
        { type: "FOREX" as DSL.MarketType, method: "isForex" as const },
      ];

      for (const test of marketTests) {
        const result = Market.create(test.type, "US", "CASH");
        expect(isSuccess(result)).toBe(true);
        const marketInstance = getValue(result);
        expect(marketInstance[test.method]()).toBe(true);
      }
    });
  });

  describe("segment methods", () => {
    it("should correctly identify cash market", () => {
      const result = Market.create("EQUITY", "US", "CASH");
      expect(isSuccess(result)).toBe(true);

      const marketInstance = getValue(result);
      expect(marketInstance.isCash()).toBe(true);
      expect(marketInstance.isDerivatives()).toBe(false);
    });

    it("should correctly identify derivatives market with futures", () => {
      const result = Market.create("COMMODITY", "US", "FUTURES");
      expect(isSuccess(result)).toBe(true);

      const marketInstance = getValue(result);
      expect(marketInstance.isDerivatives()).toBe(true);
      expect(marketInstance.isCash()).toBe(false);
    });

    it("should correctly identify derivatives market with options", () => {
      const result = Market.create("EQUITY", "US", "OPTIONS");
      expect(isSuccess(result)).toBe(true);

      const marketInstance = getValue(result);
      expect(marketInstance.isDerivatives()).toBe(true);
      expect(marketInstance.isCash()).toBe(false);
    });

    it("should correctly identify all segments", () => {
      const segmentTests = [
        { segment: "CASH" as DSL.Segment, isCash: true, isDerivatives: false },
        { segment: "FUTURES" as DSL.Segment, isCash: false, isDerivatives: true },
        { segment: "OPTIONS" as DSL.Segment, isCash: false, isDerivatives: true },
      ];

      for (const test of segmentTests) {
        const result = Market.create("EQUITY", "US", test.segment);
        expect(isSuccess(result)).toBe(true);
        const marketInstance = getValue(result);
        expect(marketInstance.isCash()).toBe(test.isCash);
        expect(marketInstance.isDerivatives()).toBe(test.isDerivatives);
      }
    });
  });

  describe("toString() method", () => {
    it("should return formatted string representation", () => {
      const result = Market.create("EQUITY", "US", "CASH");
      expect(isSuccess(result)).toBe(true);

      const marketInstance = getValue(result);
      const str = marketInstance.toString();
      expect(str).toContain("EQUITY");
      expect(str).toContain("US");
      expect(str).toContain("CASH");
      expect(str).toContain("Market{");
    });

    it("should return formatted string for derivatives", () => {
      const result = Market.create("DERIVATIVE", "GB", "FUTURES");
      expect(isSuccess(result)).toBe(true);

      const marketInstance = getValue(result);
      const str = marketInstance.toString();
      expect(str).toContain("DERIVATIVE");
      expect(str).toContain("GB");
      expect(str).toContain("FUTURES");
    });
  });

  describe("toObject() method", () => {
    it("should return DSL-compatible object", () => {
      const result = Market.create("COMMODITY", "CA", "FUTURES");
      expect(isSuccess(result)).toBe(true);

      const marketInstance = getValue(result);
      const obj = marketInstance.toObject();
      expect(obj.type).toBe("COMMODITY");
      expect(obj.region).toBe("CA");
      expect(obj.segment).toBe("FUTURES");
    });

    it("should return object that can be used with fromDSL", () => {
      const result1 = Market.create("BOND", "DE", "CASH");
      expect(isSuccess(result1)).toBe(true);

      const marketInstance1 = getValue(result1);
      const obj = marketInstance1.toObject();
      const result2 = Market.fromDSL(obj);

      expect(isSuccess(result2)).toBe(true);
      const marketInstance2 = getValue(result2);
      expect(marketInstance2.type).toBe("BOND");
      expect(marketInstance2.region).toBe("DE");
      expect(marketInstance2.segment).toBe("CASH");
    });
  });

  describe("real world markets", () => {
    it("should handle major US markets", () => {
      const usMarkets = [
        {
          type: "EQUITY" as DSL.MarketType,
          segment: "CASH" as DSL.Segment,
          description: "NYSE/NASDAQ",
        },
        {
          type: "EQUITY" as DSL.MarketType,
          segment: "OPTIONS" as DSL.Segment,
          description: "CBOE",
        },
        {
          type: "COMMODITY" as DSL.MarketType,
          segment: "FUTURES" as DSL.Segment,
          description: "CME",
        },
        { type: "BOND" as DSL.MarketType, segment: "CASH" as DSL.Segment, description: "Treasury" },
        {
          type: "CRYPTO" as DSL.MarketType,
          segment: "CASH" as DSL.Segment,
          description: "Crypto exchanges",
        },
      ];

      for (const market of usMarkets) {
        const result = Market.create(market.type, "US", market.segment);
        expect(isSuccess(result)).toBe(true);
        const marketInstance = getValue(result);
        expect(marketInstance.region).toBe("US");
        expect(marketInstance.type).toBe(market.type);
        expect(marketInstance.segment).toBe(market.segment);
      }
    });

    it("should handle major European markets", () => {
      const europeanMarkets = [
        {
          region: "GB",
          type: "EQUITY" as DSL.MarketType,
          segment: "CASH" as DSL.Segment,
          description: "LSE",
        },
        {
          region: "DE",
          type: "EQUITY" as DSL.MarketType,
          segment: "CASH" as DSL.Segment,
          description: "Xetra",
        },
        {
          region: "FR",
          type: "EQUITY" as DSL.MarketType,
          segment: "CASH" as DSL.Segment,
          description: "Euronext Paris",
        },
        {
          region: "CH",
          type: "EQUITY" as DSL.MarketType,
          segment: "CASH" as DSL.Segment,
          description: "SIX Swiss",
        },
        {
          region: "GB",
          type: "DERIVATIVE" as DSL.MarketType,
          segment: "FUTURES" as DSL.Segment,
          description: "ICE Futures",
        },
      ];

      for (const market of europeanMarkets) {
        const result = Market.create(market.type, market.region, market.segment);
        expect(isSuccess(result)).toBe(true);
        const marketInstance = getValue(result);
        expect(marketInstance.region).toBe(market.region);
        expect(marketInstance.type).toBe(market.type);
      }
    });

    it("should handle major Asian markets", () => {
      const asianMarkets = [
        {
          region: "JP",
          type: "EQUITY" as DSL.MarketType,
          segment: "CASH" as DSL.Segment,
          description: "TSE",
        },
        {
          region: "HK",
          type: "EQUITY" as DSL.MarketType,
          segment: "CASH" as DSL.Segment,
          description: "HKEX",
        },
        {
          region: "SG",
          type: "EQUITY" as DSL.MarketType,
          segment: "CASH" as DSL.Segment,
          description: "SGX",
        },
        {
          region: "AU",
          type: "EQUITY" as DSL.MarketType,
          segment: "CASH" as DSL.Segment,
          description: "ASX",
        },
        {
          region: "IN",
          type: "EQUITY" as DSL.MarketType,
          segment: "CASH" as DSL.Segment,
          description: "NSE/BSE",
        },
      ];

      for (const market of asianMarkets) {
        const result = Market.create(market.type, market.region, market.segment);
        expect(isSuccess(result)).toBe(true);
        const marketInstance = getValue(result);
        expect(marketInstance.region).toBe(market.region);
        expect(marketInstance.isEquity()).toBe(true);
        expect(marketInstance.isCash()).toBe(true);
      }
    });

    it("should handle US forex market", () => {
      const result = Market.create("FOREX", "US", "CASH");
      expect(isSuccess(result)).toBe(true);

      const marketInstance = getValue(result);
      expect(marketInstance.isForex()).toBe(true);
      expect(marketInstance.region).toBe("US");
      expect(marketInstance.isCash()).toBe(true);
    });
  });

  describe("error handling", () => {
    it("should provide detailed error context for validation failures", () => {
      const result = Market.create("INVALID" as any, "invalid", "INVALID" as any);

      expect(isFailure(result)).toBe(true);
      const error = getError(result);
      expect(error.category).toBe("VALIDATION");
      expect(error.context).toBeDefined();
    });

    it("should maintain error categories consistently", () => {
      const testCases = [
        ["INVALID" as any, "US", "CASH"],
        ["EQUITY", "invalid", "CASH"],
        ["EQUITY", "US", "INVALID" as any],
      ];

      for (const [type, region, segment] of testCases) {
        const result = Market.create(type, region, segment);
        expect(isFailure(result)).toBe(true);
        const error = getError(result);
        expect(error.category).toBe("VALIDATION");
      }
    });

    it("should handle edge cases gracefully", () => {
      const edgeCases = [
        [null, "US", "CASH"],
        ["EQUITY", null, "CASH"],
        ["EQUITY", "US", null],
        [undefined, "US", "CASH"],
        ["EQUITY", "", "CASH"],
        ["EQUITY", "US", ""],
      ];

      for (const [type, region, segment] of edgeCases) {
        const result = Market.create(type as any, region as any, segment as any);
        expect(isFailure(result)).toBe(true);
        const error = getError(result);
        expect(error.category).toBe("VALIDATION");
      }
    });
  });
});

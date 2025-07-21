/**
 * Unit tests for MarketDepth smart constructor
 * Tests the MD layer implementation of DSL MarketDepth interface
 *
 * CORRECT PARAMETER ORDER: MarketDepth.create(timestamp, bids, asks, ...)
 * EACH DepthLevel MUST HAVE: { price: string, size: string, level: number }
 */

import { getError, getValue, isFailure, isSuccess } from "@qi/base";
import type { MarketDepth as DSLMarketDepth, DepthLevel } from "@qi/dp/dsl";
import { describe, expect, it } from "vitest";
import { MarketDepth } from "../../src/md/market-depth.js";

describe("MarketDepth Smart Constructor", () => {
  const validBids: DepthLevel[] = [
    { price: "65000.00", size: "10.5", level: 1 },
    { price: "64999.50", size: "5.25", level: 2 },
    { price: "64999.00", size: "2.75", level: 3 },
  ];

  const validAsks: DepthLevel[] = [
    { price: "65000.50", size: "8.25", level: 1 },
    { price: "65001.00", size: "12.0", level: 2 },
    { price: "65001.50", size: "6.5", level: 3 },
  ];

  describe("create() method", () => {
    it("should create valid MarketDepth with all required fields", () => {
      const result = MarketDepth.create("2025-07-21T12:00:00.000Z", validBids, validAsks);

      expect(isSuccess(result)).toBe(true);
      const depth = getValue(result);
      expect(depth.timestamp).toBe("2025-07-21T12:00:00.000Z");
      expect(depth.bids).toEqual(validBids);
      expect(depth.asks).toEqual(validAsks);
    });

    it("should create valid MarketDepth with single levels", () => {
      const singleBid: DepthLevel[] = [{ price: "50000.00", size: "5.0", level: 1 }];
      const singleAsk: DepthLevel[] = [{ price: "50000.50", size: "3.0", level: 1 }];

      const result = MarketDepth.create("2025-07-21T12:00:00.000Z", singleBid, singleAsk);

      expect(isSuccess(result)).toBe(true);
      const depth = getValue(result);
      expect(depth.bids).toEqual(singleBid);
      expect(depth.asks).toEqual(singleAsk);
    });

    it("should create valid MarketDepth with many levels", () => {
      const manyBids: DepthLevel[] = [];
      const manyAsks: DepthLevel[] = [];

      // Create 20 bid levels
      for (let i = 0; i < 20; i++) {
        manyBids.push({
          price: (65000 - i * 0.5).toFixed(2),
          size: (Math.random() * 10 + 1).toFixed(2),
          level: i + 1,
        });
      }

      // Create 20 ask levels
      for (let i = 0; i < 20; i++) {
        manyAsks.push({
          price: (65000.5 + i * 0.5).toFixed(2),
          size: (Math.random() * 10 + 1).toFixed(2),
          level: i + 1,
        });
      }

      const result = MarketDepth.create("2025-07-21T12:00:00.000Z", manyBids, manyAsks);

      expect(isSuccess(result)).toBe(true);
      const depth = getValue(result);
      expect(depth.bids.length).toBe(20);
      expect(depth.asks.length).toBe(20);
    });

    describe("timestamp validation", () => {
      it("should reject invalid timestamp format", () => {
        const result = MarketDepth.create("invalid-timestamp", validBids, validAsks);

        expect(isFailure(result)).toBe(true);
        expect(getError(result).code).toBe("INVALID_TIMESTAMP_FORMAT");
      });

      it("should reject empty timestamp", () => {
        const result = MarketDepth.create("", validBids, validAsks);

        expect(isFailure(result)).toBe(true);
        expect(getError(result).code).toBe("INVALID_TIMESTAMP");
      });

      it("should reject truly invalid timestamp", () => {
        const result = MarketDepth.create("definitely-not-a-date", validBids, validAsks);

        expect(isFailure(result)).toBe(true);
        expect(getError(result).code).toBe("INVALID_TIMESTAMP_FORMAT");
      });
    });

    describe("bids validation", () => {
      it("should reject empty bids when asks also empty", () => {
        const result = MarketDepth.create("2025-07-21T12:00:00.000Z", [], []);

        expect(isFailure(result)).toBe(true);
        expect(getError(result).code).toBe("EMPTY_DEPTH");
      });

      it("should reject non-array bids", () => {
        const result = MarketDepth.create(
          "2025-07-21T12:00:00.000Z",
          "not-an-array" as any,
          validAsks
        );

        expect(isFailure(result)).toBe(true);
        expect(getError(result).code).toBe("INVALID_BIDS_TYPE");
      });

      it("should reject undefined bid level", () => {
        const bidsWithUndefined = [undefined as any];
        const result = MarketDepth.create("2025-07-21T12:00:00.000Z", bidsWithUndefined, validAsks);

        expect(isFailure(result)).toBe(true);
        expect(getError(result).code).toBe("UNDEFINED_BID_LEVEL");
      });

      it("should reject bids with zero price", () => {
        const invalidBids: DepthLevel[] = [{ price: "0", size: "10.5", level: 1 }];

        const result = MarketDepth.create("2025-07-21T12:00:00.000Z", invalidBids, validAsks);

        expect(isFailure(result)).toBe(true);
        expect(getError(result).code).toBe("INVALID_DECIMAL_POSITIVE");
      });

      it("should reject bids with negative price", () => {
        const invalidBids: DepthLevel[] = [{ price: "-100.00", size: "10.5", level: 1 }];

        const result = MarketDepth.create("2025-07-21T12:00:00.000Z", invalidBids, validAsks);

        expect(isFailure(result)).toBe(true);
        expect(getError(result).code).toBe("INVALID_DECIMAL_POSITIVE");
      });

      it("should reject bids with zero size", () => {
        const invalidBids: DepthLevel[] = [{ price: "65000.00", size: "0", level: 1 }];

        const result = MarketDepth.create("2025-07-21T12:00:00.000Z", invalidBids, validAsks);

        expect(isFailure(result)).toBe(true);
        expect(getError(result).code).toBe("INVALID_DECIMAL_POSITIVE");
      });

      it("should reject bids with negative size", () => {
        const invalidBids: DepthLevel[] = [{ price: "65000.00", size: "-5.0", level: 1 }];

        const result = MarketDepth.create("2025-07-21T12:00:00.000Z", invalidBids, validAsks);

        expect(isFailure(result)).toBe(true);
        expect(getError(result).code).toBe("INVALID_DECIMAL_POSITIVE");
      });

      it("should reject bids not in descending price order", () => {
        const unorderedBids: DepthLevel[] = [
          { price: "64999.00", size: "5.25", level: 1 }, // lower price first
          { price: "65000.00", size: "10.5", level: 2 },
        ];

        const result = MarketDepth.create("2025-07-21T12:00:00.000Z", unorderedBids, validAsks);

        expect(isFailure(result)).toBe(true);
        expect(getError(result).code).toBe("INVALID_BID_ORDERING");
      });

      it("should reject bid level with non-object type", () => {
        const invalidBids = ["not-an-object" as any];
        const result = MarketDepth.create("2025-07-21T12:00:00.000Z", invalidBids, validAsks);

        expect(isFailure(result)).toBe(true);
        expect(getError(result).code).toBe("INVALID_DEPTH_LEVEL_TYPE");
      });

      it("should reject bid level with non-string price", () => {
        const invalidBids = [{ price: 123.45, size: "10.5", level: 1 } as any];
        const result = MarketDepth.create("2025-07-21T12:00:00.000Z", invalidBids, validAsks);

        expect(isFailure(result)).toBe(true);
        expect(getError(result).code).toBe("INVALID_DEPTH_LEVEL_PRICE_TYPE");
      });

      it("should reject bid level with non-string size", () => {
        const invalidBids = [{ price: "65000.00", size: 10.5, level: 1 } as any];
        const result = MarketDepth.create("2025-07-21T12:00:00.000Z", invalidBids, validAsks);

        expect(isFailure(result)).toBe(true);
        expect(getError(result).code).toBe("INVALID_DEPTH_LEVEL_SIZE_TYPE");
      });

      it("should reject bid level with invalid level number", () => {
        const invalidBids = [{ price: "65000.00", size: "10.5", level: 0 } as any];
        const result = MarketDepth.create("2025-07-21T12:00:00.000Z", invalidBids, validAsks);

        expect(isFailure(result)).toBe(true);
        expect(getError(result).code).toBe("INVALID_DEPTH_LEVEL_NUMBER");
      });
    });

    describe("asks validation", () => {
      it("should accept empty asks when bids present", () => {
        const result = MarketDepth.create("2025-07-21T12:00:00.000Z", validBids, []);

        expect(isSuccess(result)).toBe(true);
      });

      it("should reject non-array asks", () => {
        const result = MarketDepth.create(
          "2025-07-21T12:00:00.000Z",
          validBids,
          "not-an-array" as any
        );

        expect(isFailure(result)).toBe(true);
        expect(getError(result).code).toBe("INVALID_ASKS_TYPE");
      });

      it("should reject undefined ask level", () => {
        const asksWithUndefined = [undefined as any];
        const result = MarketDepth.create("2025-07-21T12:00:00.000Z", validBids, asksWithUndefined);

        expect(isFailure(result)).toBe(true);
        expect(getError(result).code).toBe("UNDEFINED_ASK_LEVEL");
      });

      it("should reject asks with zero price", () => {
        const invalidAsks: DepthLevel[] = [{ price: "0", size: "8.25", level: 1 }];

        const result = MarketDepth.create("2025-07-21T12:00:00.000Z", validBids, invalidAsks);

        expect(isFailure(result)).toBe(true);
        expect(getError(result).code).toBe("INVALID_DECIMAL_POSITIVE");
      });

      it("should reject asks with negative price", () => {
        const invalidAsks: DepthLevel[] = [{ price: "-100.50", size: "8.25", level: 1 }];

        const result = MarketDepth.create("2025-07-21T12:00:00.000Z", validBids, invalidAsks);

        expect(isFailure(result)).toBe(true);
        expect(getError(result).code).toBe("INVALID_DECIMAL_POSITIVE");
      });

      it("should reject asks with zero size", () => {
        const invalidAsks: DepthLevel[] = [{ price: "65000.50", size: "0", level: 1 }];

        const result = MarketDepth.create("2025-07-21T12:00:00.000Z", validBids, invalidAsks);

        expect(isFailure(result)).toBe(true);
        expect(getError(result).code).toBe("INVALID_DECIMAL_POSITIVE");
      });

      it("should reject asks with negative size", () => {
        const invalidAsks: DepthLevel[] = [{ price: "65000.50", size: "-8.25", level: 1 }];

        const result = MarketDepth.create("2025-07-21T12:00:00.000Z", validBids, invalidAsks);

        expect(isFailure(result)).toBe(true);
        expect(getError(result).code).toBe("INVALID_DECIMAL_POSITIVE");
      });

      it("should reject asks not in ascending price order", () => {
        const unorderedAsks: DepthLevel[] = [
          { price: "65001.00", size: "12.0", level: 1 }, // higher price first
          { price: "65000.50", size: "8.25", level: 2 },
        ];

        const result = MarketDepth.create("2025-07-21T12:00:00.000Z", validBids, unorderedAsks);

        expect(isFailure(result)).toBe(true);
        expect(getError(result).code).toBe("INVALID_ASK_ORDERING");
      });
    });

    describe("cross validation", () => {
      it("should reject crossed market (best bid > best ask)", () => {
        const crossedBids: DepthLevel[] = [
          { price: "65001.00", size: "10.5", level: 1 }, // higher than best ask
        ];
        const crossedAsks: DepthLevel[] = [{ price: "65000.50", size: "8.25", level: 1 }];

        const result = MarketDepth.create("2025-07-21T12:00:00.000Z", crossedBids, crossedAsks);

        expect(isFailure(result)).toBe(true);
        expect(getError(result).code).toBe("CROSSED_MARKET");
      });

      it("should accept touching market (best bid = best ask)", () => {
        const touchingBids: DepthLevel[] = [{ price: "65000.50", size: "10.5", level: 1 }];
        const touchingAsks: DepthLevel[] = [{ price: "65000.50", size: "8.25", level: 1 }];

        const result = MarketDepth.create("2025-07-21T12:00:00.000Z", touchingBids, touchingAsks);

        expect(isSuccess(result)).toBe(true);
      });

      it("should accept only bids (no asks)", () => {
        const result = MarketDepth.create("2025-07-21T12:00:00.000Z", validBids, []);

        expect(isSuccess(result)).toBe(true);
        const depth = getValue(result);
        expect(depth.bids.length).toBe(3);
        expect(depth.asks.length).toBe(0);
      });

      it("should accept only asks (no bids)", () => {
        const result = MarketDepth.create("2025-07-21T12:00:00.000Z", [], validAsks);

        expect(isSuccess(result)).toBe(true);
        const depth = getValue(result);
        expect(depth.bids.length).toBe(0);
        expect(depth.asks.length).toBe(3);
      });
    });

    describe("optional parameters validation", () => {
      it("should create valid MarketDepth with all optional fields", () => {
        const result = MarketDepth.create(
          "2025-07-21T12:00:00.000Z",
          validBids,
          validAsks,
          12345, // sequenceNumber
          "50.75", // totalBidSize
          "32.0" // totalAskSize
        );

        expect(isSuccess(result)).toBe(true);
        const depth = getValue(result);
        expect(depth.sequenceNumber).toBe(12345);
        expect(depth.totalBidSize).toBe("50.75");
        expect(depth.totalAskSize).toBe("32.0");
      });

      it("should reject invalid sequence number", () => {
        const result = MarketDepth.create(
          "2025-07-21T12:00:00.000Z",
          validBids,
          validAsks,
          -1 // negative sequence number
        );

        expect(isFailure(result)).toBe(true);
        expect(getError(result).code).toBe("INVALID_SEQUENCE_NUMBER");
      });

      it("should reject non-integer sequence number", () => {
        const result = MarketDepth.create(
          "2025-07-21T12:00:00.000Z",
          validBids,
          validAsks,
          123.45 // non-integer sequence number
        );

        expect(isFailure(result)).toBe(true);
        expect(getError(result).code).toBe("INVALID_SEQUENCE_NUMBER");
      });

      it("should reject negative totalBidSize", () => {
        const result = MarketDepth.create(
          "2025-07-21T12:00:00.000Z",
          validBids,
          validAsks,
          undefined,
          "-10.5" // negative totalBidSize
        );

        expect(isFailure(result)).toBe(true);
        expect(getError(result).code).toBe("INVALID_DECIMAL_NON_NEGATIVE");
      });

      it("should reject negative totalAskSize", () => {
        const result = MarketDepth.create(
          "2025-07-21T12:00:00.000Z",
          validBids,
          validAsks,
          undefined,
          undefined,
          "-8.25" // negative totalAskSize
        );

        expect(isFailure(result)).toBe(true);
        expect(getError(result).code).toBe("INVALID_DECIMAL_NON_NEGATIVE");
      });

      it("should accept zero totalBidSize and totalAskSize", () => {
        const result = MarketDepth.create(
          "2025-07-21T12:00:00.000Z",
          validBids,
          validAsks,
          undefined,
          "0", // zero totalBidSize
          "0" // zero totalAskSize
        );

        expect(isSuccess(result)).toBe(true);
        const depth = getValue(result);
        expect(depth.totalBidSize).toBe("0");
        expect(depth.totalAskSize).toBe("0");
      });
    });
  });

  describe("fromDSL() method", () => {
    it("should create MarketDepth from valid DSL MarketDepth object", () => {
      const dslMarketDepth: DSLMarketDepth = {
        timestamp: "2025-07-21T12:00:00.000Z",
        bids: validBids,
        asks: validAsks,
      };

      const result = MarketDepth.fromDSL(dslMarketDepth);

      expect(isSuccess(result)).toBe(true);
      const depth = getValue(result);
      expect(depth.timestamp).toBe("2025-07-21T12:00:00.000Z");
      expect(depth.bids).toEqual(validBids);
      expect(depth.asks).toEqual(validAsks);
    });

    it("should create MarketDepth from DSL object with single levels", () => {
      const singleBid: DepthLevel[] = [{ price: "50000.00", size: "5.0", level: 1 }];
      const singleAsk: DepthLevel[] = [{ price: "50000.50", size: "3.0", level: 1 }];

      const dslMarketDepth: DSLMarketDepth = {
        timestamp: "2025-07-21T12:00:00.000Z",
        bids: singleBid,
        asks: singleAsk,
      };

      const result = MarketDepth.fromDSL(dslMarketDepth);

      expect(isSuccess(result)).toBe(true);
      const depth = getValue(result);
      expect(depth.bids).toEqual(singleBid);
      expect(depth.asks).toEqual(singleAsk);
    });

    it("should fail validation for invalid DSL MarketDepth object", () => {
      const invalidDslMarketDepth: DSLMarketDepth = {
        timestamp: "invalid",
        bids: validBids,
        asks: validAsks,
      };

      const result = MarketDepth.fromDSL(invalidDslMarketDepth);

      expect(isFailure(result)).toBe(true);
    });

    it("should fail for crossed market in DSL object", () => {
      const crossedBids: DepthLevel[] = [{ price: "65001.00", size: "10.5", level: 1 }];
      const crossedAsks: DepthLevel[] = [{ price: "65000.50", size: "8.25", level: 1 }];

      const crossedDslMarketDepth: DSLMarketDepth = {
        timestamp: "2025-07-21T12:00:00.000Z",
        bids: crossedBids,
        asks: crossedAsks,
      };

      const result = MarketDepth.fromDSL(crossedDslMarketDepth);

      expect(isFailure(result)).toBe(true);
      expect(getError(result).code).toBe("CROSSED_MARKET");
    });
  });

  describe("helper methods", () => {
    it("should get best bid price correctly", () => {
      const result = MarketDepth.create("2025-07-21T12:00:00.000Z", validBids, validAsks);

      expect(isSuccess(result)).toBe(true);
      const depth = getValue(result);
      expect(depth.getBestBid()).toBe("65000.00");
    });

    it("should get best ask price correctly", () => {
      const result = MarketDepth.create("2025-07-21T12:00:00.000Z", validBids, validAsks);

      expect(isSuccess(result)).toBe(true);
      const depth = getValue(result);
      expect(depth.getBestAsk()).toBe("65000.50");
    });

    it("should return null for best bid when no bids", () => {
      const result = MarketDepth.create("2025-07-21T12:00:00.000Z", [], validAsks);

      expect(isSuccess(result)).toBe(true);
      const depth = getValue(result);
      expect(depth.getBestBid()).toBe(null);
    });

    it("should return null for best ask when no asks", () => {
      const result = MarketDepth.create("2025-07-21T12:00:00.000Z", validBids, []);

      expect(isSuccess(result)).toBe(true);
      const depth = getValue(result);
      expect(depth.getBestAsk()).toBe(null);
    });

    it("should calculate spread correctly", () => {
      const result = MarketDepth.create("2025-07-21T12:00:00.000Z", validBids, validAsks);

      expect(isSuccess(result)).toBe(true);
      const depth = getValue(result);
      expect(depth.getSpread()).toBe(0.5); // 65000.50 - 65000.00
    });

    it("should return null spread when missing bid or ask", () => {
      const result = MarketDepth.create("2025-07-21T12:00:00.000Z", [], validAsks);

      expect(isSuccess(result)).toBe(true);
      const depth = getValue(result);
      expect(depth.getSpread()).toBe(null);
    });

    it("should calculate mid-price correctly", () => {
      const result = MarketDepth.create("2025-07-21T12:00:00.000Z", validBids, validAsks);

      expect(isSuccess(result)).toBe(true);
      const depth = getValue(result);
      expect(depth.getMidPrice()).toBe("65000.25"); // (65000.00 + 65000.50) / 2
    });

    it("should return null mid-price when missing bid or ask", () => {
      const result = MarketDepth.create("2025-07-21T12:00:00.000Z", validBids, []);

      expect(isSuccess(result)).toBe(true);
      const depth = getValue(result);
      expect(depth.getMidPrice()).toBe(null);
    });

    it("should calculate total bid size correctly", () => {
      const result = MarketDepth.create("2025-07-21T12:00:00.000Z", validBids, validAsks);

      expect(isSuccess(result)).toBe(true);
      const depth = getValue(result);
      expect(depth.getTotalBidSize()).toBe(18.5); // 10.5 + 5.25 + 2.75
    });

    it("should calculate total ask size correctly", () => {
      const result = MarketDepth.create("2025-07-21T12:00:00.000Z", validBids, validAsks);

      expect(isSuccess(result)).toBe(true);
      const depth = getValue(result);
      expect(depth.getTotalAskSize()).toBe(26.75); // 8.25 + 12.0 + 6.5
    });
  });

  describe("toString() method", () => {
    it("should return formatted string with all fields", () => {
      const result = MarketDepth.create("2025-07-21T12:00:00.000Z", validBids, validAsks);

      expect(isSuccess(result)).toBe(true);
      const depth = getValue(result);
      const str = depth.toString();

      expect(str).toContain("MarketDepth{");
      expect(str).toContain("timestamp: 2025-07-21T12:00:00.000Z");
      expect(str).toContain("levels: 3×3");
      expect(str).toContain("spread:");
    });

    it("should return formatted string with single levels", () => {
      const singleBid: DepthLevel[] = [{ price: "50000.00", size: "5.0", level: 1 }];
      const singleAsk: DepthLevel[] = [{ price: "50000.50", size: "3.0", level: 1 }];

      const result = MarketDepth.create("2025-07-21T12:00:00.000Z", singleBid, singleAsk);

      expect(isSuccess(result)).toBe(true);
      const depth = getValue(result);
      const str = depth.toString();

      expect(str).toContain("MarketDepth{");
      expect(str).toContain("levels: 1×1");
      expect(str).toContain("spread:");
    });
  });

  describe("toObject() method", () => {
    it("should return DSL-compatible object", () => {
      const result = MarketDepth.create("2025-07-21T12:00:00.000Z", validBids, validAsks);

      expect(isSuccess(result)).toBe(true);
      const depth = getValue(result);
      const obj = depth.toObject();

      expect(obj).toEqual({
        timestamp: "2025-07-21T12:00:00.000Z",
        bids: validBids,
        asks: validAsks,
      });
    });

    it("should return object that can be used with fromDSL", () => {
      const originalResult = MarketDepth.create("2025-07-21T12:00:00.000Z", validBids, validAsks);

      expect(isSuccess(originalResult)).toBe(true);
      const originalDepth = getValue(originalResult);
      const obj = originalDepth.toObject();

      const recreatedResult = MarketDepth.fromDSL(obj);
      expect(isSuccess(recreatedResult)).toBe(true);

      const recreatedDepth = getValue(recreatedResult);
      expect(recreatedDepth.timestamp).toBe(originalDepth.timestamp);
      expect(recreatedDepth.bids).toEqual(originalDepth.bids);
      expect(recreatedDepth.asks).toEqual(originalDepth.asks);
    });
  });

  describe("edge cases and boundary conditions", () => {
    it("should handle high precision decimal prices and sizes", () => {
      const precisionBids: DepthLevel[] = [
        { price: "123.123456789012345", size: "0.987654321098765", level: 1 },
      ];
      const precisionAsks: DepthLevel[] = [
        { price: "123.123456789012346", size: "1.123456789012345", level: 1 },
      ];

      const result = MarketDepth.create("2025-07-21T12:00:00.000Z", precisionBids, precisionAsks);

      expect(isSuccess(result)).toBe(true);
      const depth = getValue(result);
      expect(depth.bids[0].price).toBe("123.123456789012345");
      expect(depth.bids[0].size).toBe("0.987654321098765");
      expect(depth.asks[0].price).toBe("123.123456789012346");
      expect(depth.asks[0].size).toBe("1.123456789012345");
    });

    it("should handle timestamps with different timezone formats", () => {
      const utcResult = MarketDepth.create("2025-07-21T12:00:00.000Z", validBids, validAsks);

      const offsetResult = MarketDepth.create(
        "2025-07-21T12:00:00.000+00:00",
        validBids,
        validAsks
      );

      expect(isSuccess(utcResult)).toBe(true);
      expect(isSuccess(offsetResult)).toBe(true);
    });

    it("should handle very tight spreads", () => {
      const tightBids: DepthLevel[] = [{ price: "50000.00000000", size: "100.0", level: 1 }];
      const tightAsks: DepthLevel[] = [{ price: "50000.00000001", size: "200.0", level: 1 }];

      const result = MarketDepth.create("2025-07-21T12:00:00.000Z", tightBids, tightAsks);

      expect(isSuccess(result)).toBe(true);
      const depth = getValue(result);
      expect(depth.bids[0].price).toBe("50000.00000000");
      expect(depth.asks[0].price).toBe("50000.00000001");
    });

    it("should handle very large order book", () => {
      const largeBids: DepthLevel[] = [];
      const largeAsks: DepthLevel[] = [];

      // Create 100 bid levels
      for (let i = 0; i < 100; i++) {
        largeBids.push({
          price: (65000 - i * 0.01).toFixed(8),
          size: (Math.random() * 1000 + 1).toFixed(8),
          level: i + 1,
        });
      }

      // Create 100 ask levels
      for (let i = 0; i < 100; i++) {
        largeAsks.push({
          price: (65000.01 + i * 0.01).toFixed(8),
          size: (Math.random() * 1000 + 1).toFixed(8),
          level: i + 1,
        });
      }

      const result = MarketDepth.create("2025-07-21T12:00:00.000Z", largeBids, largeAsks);

      expect(isSuccess(result)).toBe(true);
      const depth = getValue(result);
      expect(depth.bids.length).toBe(100);
      expect(depth.asks.length).toBe(100);
    });

    it("should handle non-numeric level string in DepthLevel", () => {
      const invalidBids = [{ price: "65000.00", size: "10.5", level: "invalid" } as any];
      const result = MarketDepth.create("2025-07-21T12:00:00.000Z", invalidBids, validAsks);

      expect(isFailure(result)).toBe(true);
      expect(getError(result).code).toBe("INVALID_DEPTH_LEVEL_NUMBER");
    });

    it("should handle missing required DepthLevel properties", () => {
      const incompleteBids = [{ price: "65000.00" } as any]; // missing size and level
      const result = MarketDepth.create("2025-07-21T12:00:00.000Z", incompleteBids, validAsks);

      expect(isFailure(result)).toBe(true);
      expect(getError(result).code).toBe("INVALID_DEPTH_LEVEL_SIZE_TYPE");
    });

    it("should handle invalid decimal format in price", () => {
      const invalidBids = [{ price: "not-a-number", size: "10.5", level: 1 }];
      const result = MarketDepth.create("2025-07-21T12:00:00.000Z", invalidBids, validAsks);

      expect(isFailure(result)).toBe(true);
      expect(getError(result).code).toBe("INVALID_DECIMAL_FORMAT");
    });

    it("should handle invalid decimal format in size", () => {
      const invalidBids = [{ price: "65000.00", size: "invalid-size", level: 1 }];
      const result = MarketDepth.create("2025-07-21T12:00:00.000Z", invalidBids, validAsks);

      expect(isFailure(result)).toBe(true);
      expect(getError(result).code).toBe("INVALID_DECIMAL_FORMAT");
    });
  });

  describe("toObject() with optional parameters", () => {
    it("should handle optional parameters in toObject", () => {
      const result = MarketDepth.create(
        "2025-07-21T12:00:00.000Z",
        validBids,
        validAsks,
        12345,
        "50.75",
        "32.0"
      );

      expect(isSuccess(result)).toBe(true);
      const depth = getValue(result);
      const obj = depth.toObject();

      expect(obj).toEqual({
        timestamp: "2025-07-21T12:00:00.000Z",
        bids: validBids,
        asks: validAsks,
        sequenceNumber: 12345,
        totalBidSize: "50.75",
        totalAskSize: "32.0",
      });
    });
  });
});

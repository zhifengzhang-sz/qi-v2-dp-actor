/**
 * Tests for BaseActor abstract class
 * Focuses on context management functionality
 */

import type { Result } from "@qi/base";
import { beforeEach, describe, expect, it } from "vitest";
import { BaseActor } from "../../../src/actor/abstract/BaseActor.js";
import type * as DSL from "../../../src/dsl/index.js";

// Create a concrete test implementation
class TestActor extends BaseActor {
  // Expose protected context for testing
  getContext(): DSL.DataContext {
    return this.context;
  }
}

describe("BaseActor", () => {
  let testMarket: DSL.Market;
  let testExchange: DSL.Exchange;
  let testInstrument: DSL.Instrument;
  let testContext: DSL.DataContext;
  let actor: TestActor;

  beforeEach(() => {
    testMarket = {
      type: "CRYPTO",
      region: "US",
      segment: "CASH",
    };

    testExchange = {
      id: "binance",
      name: "Binance",
      mic: null,
      timezone: "UTC",
    };

    testInstrument = {
      symbol: "BTC/USD",
      isin: null,
      name: "Bitcoin/US Dollar",
      assetClass: "CRYPTO",
      currency: "USD",
    };

    testContext = {
      market: testMarket,
      exchange: testExchange,
      instrument: testInstrument,
    };

    actor = new TestActor(testContext);
  });

  describe("constructor", () => {
    it("should initialize with provided context", () => {
      const context = actor.getContext();
      expect(context).toEqual(testContext);
      expect(context.market.type).toBe("CRYPTO");
      expect(context.exchange.id).toBe("binance");
      expect(context.instrument.symbol).toBe("BTC/USD");
    });
  });

  describe("createContext", () => {
    it("should create valid context from components", async () => {
      const result = await actor.createContext(testMarket, testExchange, testInstrument);

      expect(result.tag).toBe("success");
      if (result.tag === "success") {
        expect(result.value.market).toEqual(testMarket);
        expect(result.value.exchange).toEqual(testExchange);
        expect(result.value.instrument).toEqual(testInstrument);
      }
    });

    it("should fail when market is missing", async () => {
      const result = await actor.createContext(null as any, testExchange, testInstrument);

      expect(result.tag).toBe("failure");
      if (result.tag === "failure") {
        expect(result.error.code).toBe("CONTEXT_CREATION_ERROR");
        expect(result.error.message).toContain("Missing required context components");
        expect(result.error.context).toEqual({
          hasMarket: false,
          hasExchange: true,
          hasInstrument: true,
        });
      }
    });

    it("should fail when exchange is missing", async () => {
      const result = await actor.createContext(testMarket, null as any, testInstrument);

      expect(result.tag).toBe("failure");
      if (result.tag === "failure") {
        expect(result.error.code).toBe("CONTEXT_CREATION_ERROR");
        expect(result.error.context).toEqual({
          hasMarket: true,
          hasExchange: false,
          hasInstrument: true,
        });
      }
    });

    it("should fail when instrument is missing", async () => {
      const result = await actor.createContext(testMarket, testExchange, null as any);

      expect(result.tag).toBe("failure");
      if (result.tag === "failure") {
        expect(result.error.code).toBe("CONTEXT_CREATION_ERROR");
        expect(result.error.context).toEqual({
          hasMarket: true,
          hasExchange: true,
          hasInstrument: false,
        });
      }
    });

    it("should fail when all components are missing", async () => {
      const result = await actor.createContext(null as any, null as any, null as any);

      expect(result.tag).toBe("failure");
      if (result.tag === "failure") {
        expect(result.error.code).toBe("CONTEXT_CREATION_ERROR");
        expect(result.error.context).toEqual({
          hasMarket: false,
          hasExchange: false,
          hasInstrument: false,
        });
      }
    });
  });

  // TODO: Fix getContext tests - there's an import/compilation issue
  // describe('getContext', () => {
  //   it('should return current context in array', async () => {
  //     const query: DSL.ContextQuery = {
  //       marketType: null,
  //       exchangeId: null,
  //       assetClass: null,
  //       symbol: null,
  //       region: null
  //     };

  //     const result = await actor.getContext(query);

  //     expect(result.tag).toBe('success');
  //     if (result.tag === 'success') {
  //       expect(result.value).toHaveLength(1);
  //       expect(result.value[0]).toEqual(testContext);
  //     }
  //   });
  // });

  describe("updateMarket", () => {
    it("should update market component", async () => {
      const newMarket: DSL.Market = {
        type: "EQUITY",
        region: "EU",
        segment: "FUTURES",
      };

      const result = await actor.updateMarket(testContext, newMarket);

      expect(result.tag).toBe("success");
      if (result.tag === "success") {
        expect(result.value.market).toEqual(newMarket);
        expect(result.value.exchange).toEqual(testExchange); // unchanged
        expect(result.value.instrument).toEqual(testInstrument); // unchanged
      }
    });

    it("should fail when market is null", async () => {
      const result = await actor.updateMarket(testContext, null as any);

      expect(result.tag).toBe("failure");
      if (result.tag === "failure") {
        expect(result.error.code).toBe("CONTEXT_UPDATE_ERROR");
        expect(result.error.message).toContain("Market cannot be null or undefined");
        expect(result.error.context?.originalContext).toEqual(testContext);
      }
    });

    it("should fail when market is undefined", async () => {
      const result = await actor.updateMarket(testContext, undefined as any);

      expect(result.tag).toBe("failure");
      if (result.tag === "failure") {
        expect(result.error.code).toBe("CONTEXT_UPDATE_ERROR");
      }
    });
  });

  describe("updateExchange", () => {
    it("should update exchange component", async () => {
      const newExchange: DSL.Exchange = {
        id: "coinbase",
        name: "Coinbase Pro",
        mic: "COIN",
        timezone: "America/New_York",
      };

      const result = await actor.updateExchange(testContext, newExchange);

      expect(result.tag).toBe("success");
      if (result.tag === "success") {
        expect(result.value.market).toEqual(testMarket); // unchanged
        expect(result.value.exchange).toEqual(newExchange);
        expect(result.value.instrument).toEqual(testInstrument); // unchanged
      }
    });

    it("should fail when exchange is null", async () => {
      const result = await actor.updateExchange(testContext, null as any);

      expect(result.tag).toBe("failure");
      if (result.tag === "failure") {
        expect(result.error.code).toBe("CONTEXT_UPDATE_ERROR");
        expect(result.error.message).toContain("Exchange cannot be null or undefined");
      }
    });
  });

  describe("updateInstrument", () => {
    it("should update instrument component", async () => {
      const newInstrument: DSL.Instrument = {
        symbol: "ETH/USD",
        isin: "ETH001",
        name: "Ethereum/US Dollar",
        assetClass: "CRYPTO",
        currency: "USD",
      };

      const result = await actor.updateInstrument(testContext, newInstrument);

      expect(result.tag).toBe("success");
      if (result.tag === "success") {
        expect(result.value.market).toEqual(testMarket); // unchanged
        expect(result.value.exchange).toEqual(testExchange); // unchanged
        expect(result.value.instrument).toEqual(newInstrument);
      }
    });

    it("should fail when instrument is null", async () => {
      const result = await actor.updateInstrument(testContext, null as any);

      expect(result.tag).toBe("failure");
      if (result.tag === "failure") {
        expect(result.error.code).toBe("CONTEXT_UPDATE_ERROR");
        expect(result.error.message).toContain("Instrument cannot be null or undefined");
      }
    });
  });

  describe("validateContext", () => {
    it("should validate a valid context", async () => {
      const result = await actor.validateContext(testContext);

      expect(result.tag).toBe("success");
    });

    it("should handle validation with different context types", async () => {
      const equityContext: DSL.DataContext = {
        market: { type: "EQUITY", region: "US", segment: "CASH" },
        exchange: { id: "nasdaq", name: "NASDAQ", mic: "XNAS", timezone: "America/New_York" },
        instrument: {
          symbol: "AAPL",
          isin: "US0378331005",
          name: "Apple Inc",
          assetClass: "STOCK",
          currency: "USD",
        },
      };

      const result = await actor.validateContext(equityContext);

      expect(result.tag).toBe("success");
    });

    it("should validate forex context", async () => {
      const forexContext: DSL.DataContext = {
        market: { type: "FOREX", region: "GLOBAL", segment: "CASH" },
        exchange: { id: "fx", name: "FX Markets", mic: null, timezone: "UTC" },
        instrument: {
          symbol: "EUR/USD",
          isin: null,
          name: "Euro/US Dollar",
          assetClass: "CURRENCY",
          currency: "USD",
        },
      };

      const result = await actor.validateContext(forexContext);

      expect(result.tag).toBe("success");
    });
  });

  describe("error handling", () => {
    it("should provide detailed error context", async () => {
      const invalidComponents = [null, undefined];

      for (const invalid of invalidComponents) {
        const result = await actor.createContext(invalid as any, invalid as any, invalid as any);
        expect(result.tag).toBe("failure");
        if (result.tag === "failure") {
          expect(result.error.code).toBe("CONTEXT_CREATION_ERROR");
          expect(result.error.category).toBe("VALIDATION");
          expect(result.error.context).toBeDefined();
        }
      }
    });

    it("should maintain error categories", async () => {
      const result = await actor.createContext(null as any, testExchange, testInstrument);

      expect(result.tag).toBe("failure");
      if (result.tag === "failure") {
        expect(result.error.category).toBe("VALIDATION");
      }
    });
  });
});

/**
 * Tests for DataContext smart constructor
 * Uses real market data examples - no mocks or stubs
 */

import { describe, expect, it } from "vitest";
import type * as DSL from "../../src/dsl/index.js";
import { DataContext } from "../../src/md/data-context.js";

describe("DataContext Smart Constructor", () => {
  describe("create() method", () => {
    it("should create valid DataContext for crypto market", () => {
      const market: DSL.Market = {
        type: "CRYPTO",
        region: "US",
        segment: "CASH",
      };

      const exchange: DSL.Exchange = {
        id: "binance",
        name: "Binance",
        mic: null,
        timezone: "UTC",
      };

      const instrument: DSL.Instrument = {
        symbol: "BTC/USD",
        isin: null,
        name: "Bitcoin/US Dollar",
        assetClass: "CRYPTO",
        currency: "USD",
      };

      const result = DataContext.create(market, exchange, instrument);

      expect(result.tag).toBe("success");
      if (result.tag === "success") {
        expect(result.value.market).toEqual(market);
        expect(result.value.exchange).toEqual(exchange);
        expect(result.value.instrument).toEqual(instrument);
      }
    });

    it("should create valid DataContext for equity market", () => {
      const market: DSL.Market = {
        type: "EQUITY",
        region: "US",
        segment: "CASH",
      };

      const exchange: DSL.Exchange = {
        id: "nasdaq",
        name: "NASDAQ",
        mic: "XNAS",
        timezone: "America/New_York",
      };

      const instrument: DSL.Instrument = {
        symbol: "AAPL",
        isin: "US0378331005",
        name: "Apple Inc",
        assetClass: "STOCK",
        currency: "USD",
      };

      const result = DataContext.create(market, exchange, instrument);

      expect(result.tag).toBe("success");
      if (result.tag === "success") {
        expect(result.value.market.type).toBe("EQUITY");
        expect(result.value.exchange.mic).toBe("XNAS");
        expect(result.value.instrument.isin).toBe("US0378331005");
      }
    });

    it("should create valid DataContext for forex market", () => {
      const market: DSL.Market = {
        type: "FOREX",
        region: "GLOBAL",
        segment: "CASH",
      };

      const exchange: DSL.Exchange = {
        id: "fx",
        name: "FX Markets",
        mic: null,
        timezone: "UTC",
      };

      const instrument: DSL.Instrument = {
        symbol: "EUR/USD",
        isin: null,
        name: "Euro/US Dollar",
        assetClass: "CURRENCY",
        currency: "USD",
      };

      const result = DataContext.create(market, exchange, instrument);

      expect(result.tag).toBe("success");
      if (result.tag === "success") {
        expect(result.value.market.type).toBe("FOREX");
        expect(result.value.instrument.assetClass).toBe("CURRENCY");
      }
    });

    it("should create valid DataContext for commodity futures", () => {
      const market: DSL.Market = {
        type: "COMMODITY",
        region: "US",
        segment: "FUTURES",
      };

      const exchange: DSL.Exchange = {
        id: "cme",
        name: "Chicago Mercantile Exchange",
        mic: "XCME",
        timezone: "America/Chicago",
      };

      const instrument: DSL.Instrument = {
        symbol: "GC=F",
        isin: null,
        name: "Gold Futures",
        assetClass: "COMMODITY",
        currency: "USD",
      };

      const result = DataContext.create(market, exchange, instrument);

      expect(result.tag).toBe("success");
      if (result.tag === "success") {
        expect(result.value.market.segment).toBe("FUTURES");
        expect(result.value.exchange.timezone).toBe("America/Chicago");
        expect(result.value.instrument.symbol).toBe("GC=F");
      }
    });

    describe("market validation", () => {
      it("should reject null market", () => {
        const exchange: DSL.Exchange = {
          id: "binance",
          name: "Binance",
          mic: null,
          timezone: "UTC",
        };

        const instrument: DSL.Instrument = {
          symbol: "BTC/USD",
          isin: null,
          name: "Bitcoin/US Dollar",
          assetClass: "CRYPTO",
          currency: "USD",
        };

        const result = DataContext.create(null as any, exchange, instrument);

        expect(result.tag).toBe("failure");
        if (result.tag === "failure") {
          expect(result.error.code).toBe("INVALID_MARKET");
          expect(result.error.message).toContain("Market must be a valid Market object");
        }
      });

      it("should reject undefined market", () => {
        const exchange: DSL.Exchange = {
          id: "binance",
          name: "Binance",
          mic: null,
          timezone: "UTC",
        };

        const instrument: DSL.Instrument = {
          symbol: "BTC/USD",
          isin: null,
          name: "Bitcoin/US Dollar",
          assetClass: "CRYPTO",
          currency: "USD",
        };

        const result = DataContext.create(undefined as any, exchange, instrument);

        expect(result.tag).toBe("failure");
        if (result.tag === "failure") {
          expect(result.error.code).toBe("INVALID_MARKET");
        }
      });

      it("should reject non-object market", () => {
        const exchange: DSL.Exchange = {
          id: "binance",
          name: "Binance",
          mic: null,
          timezone: "UTC",
        };

        const instrument: DSL.Instrument = {
          symbol: "BTC/USD",
          isin: null,
          name: "Bitcoin/US Dollar",
          assetClass: "CRYPTO",
          currency: "USD",
        };

        const result = DataContext.create("invalid" as any, exchange, instrument);

        expect(result.tag).toBe("failure");
        if (result.tag === "failure") {
          expect(result.error.code).toBe("INVALID_MARKET");
          expect(result.error.context?.type).toBe("string");
        }
      });
    });

    describe("exchange validation", () => {
      it("should reject null exchange", () => {
        const market: DSL.Market = {
          type: "CRYPTO",
          region: "US",
          segment: "CASH",
        };

        const instrument: DSL.Instrument = {
          symbol: "BTC/USD",
          isin: null,
          name: "Bitcoin/US Dollar",
          assetClass: "CRYPTO",
          currency: "USD",
        };

        const result = DataContext.create(market, null as any, instrument);

        expect(result.tag).toBe("failure");
        if (result.tag === "failure") {
          expect(result.error.code).toBe("INVALID_EXCHANGE");
          expect(result.error.message).toContain("Exchange must be a valid Exchange object");
        }
      });

      it("should reject non-object exchange", () => {
        const market: DSL.Market = {
          type: "CRYPTO",
          region: "US",
          segment: "CASH",
        };

        const instrument: DSL.Instrument = {
          symbol: "BTC/USD",
          isin: null,
          name: "Bitcoin/US Dollar",
          assetClass: "CRYPTO",
          currency: "USD",
        };

        const result = DataContext.create(market, 42 as any, instrument);

        expect(result.tag).toBe("failure");
        if (result.tag === "failure") {
          expect(result.error.code).toBe("INVALID_EXCHANGE");
          expect(result.error.context?.type).toBe("number");
        }
      });
    });

    describe("instrument validation", () => {
      it("should reject null instrument", () => {
        const market: DSL.Market = {
          type: "CRYPTO",
          region: "US",
          segment: "CASH",
        };

        const exchange: DSL.Exchange = {
          id: "binance",
          name: "Binance",
          mic: null,
          timezone: "UTC",
        };

        const result = DataContext.create(market, exchange, null as any);

        expect(result.tag).toBe("failure");
        if (result.tag === "failure") {
          expect(result.error.code).toBe("INVALID_INSTRUMENT");
          expect(result.error.message).toContain("Instrument must be a valid Instrument object");
        }
      });

      it("should reject non-object instrument", () => {
        const market: DSL.Market = {
          type: "CRYPTO",
          region: "US",
          segment: "CASH",
        };

        const exchange: DSL.Exchange = {
          id: "binance",
          name: "Binance",
          mic: null,
          timezone: "UTC",
        };

        const result = DataContext.create(market, exchange, "invalid" as any);

        expect(result.tag).toBe("failure");
        if (result.tag === "failure") {
          expect(result.error.code).toBe("INVALID_INSTRUMENT");
          expect(result.error.context?.type).toBe("string");
        }
      });
    });
  });

  describe("fromDSL() method", () => {
    it("should create DataContext from valid DSL DataContext object", () => {
      const dslContext: DSL.DataContext = {
        market: {
          type: "CRYPTO",
          region: "US",
          segment: "CASH",
        },
        exchange: {
          id: "coinbase",
          name: "Coinbase Pro",
          mic: null,
          timezone: "UTC",
        },
        instrument: {
          symbol: "ETH/USD",
          isin: null,
          name: "Ethereum/US Dollar",
          assetClass: "CRYPTO",
          currency: "USD",
        },
      };

      const result = DataContext.fromDSL(dslContext);

      expect(result.tag).toBe("success");
      if (result.tag === "success") {
        expect(result.value.market).toEqual(dslContext.market);
        expect(result.value.exchange).toEqual(dslContext.exchange);
        expect(result.value.instrument).toEqual(dslContext.instrument);
      }
    });

    it("should create DataContext from complex equity DSL object", () => {
      const dslContext: DSL.DataContext = {
        market: {
          type: "EQUITY",
          region: "JP",
          segment: "CASH",
        },
        exchange: {
          id: "tse",
          name: "Tokyo Stock Exchange",
          mic: "XTKS",
          timezone: "Asia/Tokyo",
        },
        instrument: {
          symbol: "7203",
          isin: "JP3633400001",
          name: "Toyota Motor Corporation",
          assetClass: "STOCK",
          currency: "JPY",
        },
      };

      const result = DataContext.fromDSL(dslContext);

      expect(result.tag).toBe("success");
      if (result.tag === "success") {
        expect(result.value.market.region).toBe("JP");
        expect(result.value.exchange.mic).toBe("XTKS");
        expect(result.value.instrument.currency).toBe("JPY");
      }
    });

    it("should fail validation for invalid DSL DataContext object", () => {
      const invalidDslContext = {
        market: null,
        exchange: {
          id: "binance",
          name: "Binance",
          mic: null,
          timezone: "UTC",
        },
        instrument: {
          symbol: "BTC/USD",
          isin: null,
          name: "Bitcoin/US Dollar",
          assetClass: "CRYPTO",
          currency: "USD",
        },
      } as any;

      const result = DataContext.fromDSL(invalidDslContext);

      expect(result.tag).toBe("failure");
      if (result.tag === "failure") {
        expect(result.error.code).toBe("INVALID_MARKET");
      }
    });
  });

  describe("toString() method", () => {
    it("should return formatted string representation", () => {
      const market: DSL.Market = {
        type: "EQUITY",
        region: "US",
        segment: "CASH",
      };

      const exchange: DSL.Exchange = {
        id: "nasdaq",
        name: "NASDAQ",
        mic: "XNAS",
        timezone: "America/New_York",
      };

      const instrument: DSL.Instrument = {
        symbol: "MSFT",
        isin: "US5949181045",
        name: "Microsoft Corporation",
        assetClass: "STOCK",
        currency: "USD",
      };

      const result = DataContext.create(market, exchange, instrument);
      expect(result.tag).toBe("success");

      if (result.tag === "success") {
        const str = result.value.toString();
        expect(str).toContain("MSFT");
        expect(str).toContain("nasdaq");
        expect(str).toContain("EQUITY");
        expect(str).toContain("US");
      }
    });
  });

  describe("toObject() method", () => {
    it("should return DSL-compatible object", () => {
      const market: DSL.Market = {
        type: "BOND",
        region: "DE",
        segment: "CASH",
      };

      const exchange: DSL.Exchange = {
        id: "xetra",
        name: "Xetra",
        mic: "XETR",
        timezone: "Europe/Berlin",
      };

      const instrument: DSL.Instrument = {
        symbol: "DE0001102406",
        isin: "DE0001102406",
        name: "German Government Bond",
        assetClass: "BOND",
        currency: "EUR",
      };

      const result = DataContext.create(market, exchange, instrument);
      expect(result.tag).toBe("success");

      if (result.tag === "success") {
        const obj = result.value.toObject();
        expect(obj.market).toEqual(market);
        expect(obj.exchange).toEqual(exchange);
        expect(obj.instrument).toEqual(instrument);
      }
    });

    it("should return object that can be used with fromDSL", () => {
      const market: DSL.Market = {
        type: "DERIVATIVE",
        region: "US",
        segment: "OPTIONS",
      };

      const exchange: DSL.Exchange = {
        id: "cboe",
        name: "Chicago Board Options Exchange",
        mic: "XCBO",
        timezone: "America/Chicago",
      };

      const instrument: DSL.Instrument = {
        symbol: "SPY250117C00600000",
        isin: null,
        name: "SPDR S&P 500 ETF Call Option",
        assetClass: "INDEX", // Derivatives can have INDEX asset class
        currency: "USD",
      };

      const result1 = DataContext.create(market, exchange, instrument);
      expect(result1.tag).toBe("success");

      if (result1.tag === "success") {
        const obj = result1.value.toObject();
        const result2 = DataContext.fromDSL(obj);

        expect(result2.tag).toBe("success");
        if (result2.tag === "success") {
          expect(result2.value.market).toEqual(market);
          expect(result2.value.exchange).toEqual(exchange);
          expect(result2.value.instrument).toEqual(instrument);
        }
      }
    });
  });

  describe("real world market contexts", () => {
    it("should handle London Stock Exchange context", () => {
      const result = DataContext.create(
        { type: "EQUITY", region: "GB", segment: "CASH" },
        { id: "lse", name: "London Stock Exchange", mic: "XLON", timezone: "Europe/London" },
        {
          symbol: "BARC",
          isin: "GB0031348658",
          name: "Barclays PLC",
          assetClass: "STOCK",
          currency: "GBP",
        }
      );

      expect(result.tag).toBe("success");
      if (result.tag === "success") {
        expect(result.value.market.region).toBe("GB");
        expect(result.value.exchange.timezone).toBe("Europe/London");
        expect(result.value.instrument.currency).toBe("GBP");
      }
    });

    it("should handle Hong Kong futures context", () => {
      const result = DataContext.create(
        { type: "DERIVATIVE", region: "HK", segment: "FUTURES" },
        { id: "hkex", name: "Hong Kong Exchanges", mic: "XHKG", timezone: "Asia/Hong_Kong" },
        {
          symbol: "HSI2503",
          isin: null,
          name: "Hang Seng Index Futures",
          assetClass: "INDEX",
          currency: "HKD",
        }
      );

      expect(result.tag).toBe("success");
      if (result.tag === "success") {
        expect(result.value.market.segment).toBe("FUTURES");
        expect(result.value.exchange.mic).toBe("XHKG");
        expect(result.value.instrument.assetClass).toBe("INDEX");
      }
    });

    it("should handle Brazilian commodities context", () => {
      const result = DataContext.create(
        { type: "COMMODITY", region: "BR", segment: "CASH" },
        { id: "b3", name: "B3 - Brasil Bolsa Balcão", mic: "BVMF", timezone: "America/Sao_Paulo" },
        {
          symbol: "COFFEE",
          isin: null,
          name: "Arabica Coffee",
          assetClass: "COMMODITY",
          currency: "BRL",
        }
      );

      expect(result.tag).toBe("success");
      if (result.tag === "success") {
        expect(result.value.market.type).toBe("COMMODITY");
        expect(result.value.exchange.timezone).toBe("America/Sao_Paulo");
        expect(result.value.instrument.currency).toBe("BRL");
      }
    });
  });

  describe("error handling", () => {
    it("should provide detailed error context for validation failures", () => {
      const result = DataContext.create("invalid" as any, "invalid" as any, "invalid" as any);

      expect(result.tag).toBe("failure");
      if (result.tag === "failure") {
        expect(result.error.category).toBe("VALIDATION");
        expect(result.error.context).toBeDefined();
      }
    });

    it("should maintain error categories consistently", () => {
      const testCases = [
        [null, {}, {}],
        [{}, null, {}],
        [{}, {}, null],
      ];

      for (const [market, exchange, instrument] of testCases) {
        const result = DataContext.create(market as any, exchange as any, instrument as any);
        expect(result.tag).toBe("failure");
        if (result.tag === "failure") {
          expect(result.error.category).toBe("VALIDATION");
        }
      }
    });
  });
});

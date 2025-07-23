/**
 * Tests for Exchange smart constructor
 * Uses real market data examples - no mocks or stubs
 */

import { getError, getValue, isFailure, isSuccess } from "@qi/base";
import { describe, expect, it } from "vitest";
import type * as DSL from "../../src/dsl/index.js";
import { Exchange } from "../../src/md/exchange.js";

describe("Exchange Smart Constructor", () => {
  describe("create() method", () => {
    it("should create valid Exchange with MIC code", () => {
      const result = Exchange.create("nasdaq", "NASDAQ", "XNAS", "America/New_York");

      expect(isSuccess(result)).toBe(true);
      const exchange = getValue(result);
      expect(exchange.id).toBe("nasdaq");
      expect(exchange.name).toBe("NASDAQ");
      expect(exchange.mic).toBe("XNAS");
      expect(exchange.timezone).toBe("America/New_York");
    });

    it("should create valid Exchange without MIC code", () => {
      const result = Exchange.create("binance", "Binance", null, "UTC");

      expect(isSuccess(result)).toBe(true);
      const exchange = getValue(result);
      expect(exchange.id).toBe("binance");
      expect(exchange.name).toBe("Binance");
      expect(exchange.mic).toBe(null);
      expect(exchange.timezone).toBe("UTC");
    });

    it("should create valid Exchange for major global exchanges", () => {
      const exchanges = [
        { id: "nyse", name: "New York Stock Exchange", mic: "XNYS", timezone: "America/New_York" },
        { id: "lse", name: "London Stock Exchange", mic: "XLON", timezone: "Europe/London" },
        { id: "tse", name: "Tokyo Stock Exchange", mic: "XTKS", timezone: "Asia/Tokyo" },
        { id: "hkex", name: "Hong Kong Exchanges", mic: "XHKG", timezone: "Asia/Hong_Kong" },
        { id: "euronext", name: "Euronext Paris", mic: "XPAR", timezone: "Europe/Paris" },
        {
          id: "frankfurtse",
          name: "Frankfurt Stock Exchange",
          mic: "XFRA",
          timezone: "Europe/Berlin",
        },
        { id: "six", name: "SIX Swiss Exchange", mic: "XSWX", timezone: "Europe/Zurich" },
        {
          id: "asx",
          name: "Australian Securities Exchange",
          mic: "XASX",
          timezone: "Australia/Sydney",
        },
      ];

      for (const exchange of exchanges) {
        const result = Exchange.create(exchange.id, exchange.name, exchange.mic, exchange.timezone);
        expect(isSuccess(result)).toBe(true);
        const exchangeInstance = getValue(result);
        expect(exchangeInstance.id).toBe(exchange.id);
        expect(exchangeInstance.mic).toBe(exchange.mic);
        expect(exchangeInstance.timezone).toBe(exchange.timezone);
      }
    });

    it("should create valid Exchange for crypto exchanges", () => {
      const cryptoExchanges = [
        { id: "coinbase", name: "Coinbase Pro", mic: null, timezone: "UTC" },
        { id: "kraken", name: "Kraken", mic: null, timezone: "UTC" },
        { id: "bitstamp", name: "Bitstamp", mic: null, timezone: "UTC" },
        { id: "gemini", name: "Gemini", mic: null, timezone: "America/New_York" },
        { id: "bitfinex", name: "Bitfinex", mic: null, timezone: "UTC" },
      ];

      for (const exchange of cryptoExchanges) {
        const result = Exchange.create(exchange.id, exchange.name, exchange.mic, exchange.timezone);
        expect(isSuccess(result)).toBe(true);
        const exchangeInstance = getValue(result);
        expect(exchangeInstance.mic).toBe(null);
        expect(exchangeInstance.timezone).toBe(exchange.timezone);
      }
    });

    describe("id validation", () => {
      it("should reject empty string id", () => {
        const result = Exchange.create("", "NASDAQ", "XNAS", "America/New_York");

        expect(isFailure(result)).toBe(true);
        const error = getError(result);
        expect(error.code).toBe("INVALID_STRING_EMPTY");
        expect(error.message).toContain("id cannot be empty");
      });

      it("should reject whitespace-only id", () => {
        const result = Exchange.create("   ", "NASDAQ", "XNAS", "America/New_York");

        expect(isFailure(result)).toBe(true);
        const error = getError(result);
        expect(error.code).toBe("INVALID_STRING_EMPTY");
      });

      it("should reject null id", () => {
        const result = Exchange.create(null as any, "NASDAQ", "XNAS", "America/New_York");

        expect(isFailure(result)).toBe(true);
        const error = getError(result);
        expect(error.code).toBe("INVALID_STRING_TYPE");
        expect(error.context?.field).toBe("id");
        expect(error.context?.type).toBe("object");
      });

      it("should reject undefined id", () => {
        const result = Exchange.create(undefined as any, "NASDAQ", "XNAS", "America/New_York");

        expect(isFailure(result)).toBe(true);
        const error = getError(result);
        expect(error.code).toBe("INVALID_STRING_TYPE");
        expect(error.context?.field).toBe("id");
        expect(error.context?.type).toBe("undefined");
      });

      it("should reject non-string id", () => {
        const result = Exchange.create(123 as any, "NASDAQ", "XNAS", "America/New_York");

        expect(isFailure(result)).toBe(true);
        const error = getError(result);
        expect(error.code).toBe("INVALID_STRING_TYPE");
        expect(error.context?.type).toBe("number");
      });
    });

    describe("name validation", () => {
      it("should reject empty string name", () => {
        const result = Exchange.create("nasdaq", "", "XNAS", "America/New_York");

        expect(isFailure(result)).toBe(true);
        const error = getError(result);
        expect(error.code).toBe("INVALID_STRING_EMPTY");
        expect(error.context?.field).toBe("name");
      });

      it("should reject whitespace-only name", () => {
        const result = Exchange.create("nasdaq", "   ", "XNAS", "America/New_York");

        expect(isFailure(result)).toBe(true);
        const error = getError(result);
        expect(error.code).toBe("INVALID_STRING_EMPTY");
        expect(error.context?.field).toBe("name");
      });

      it("should reject null name", () => {
        const result = Exchange.create("nasdaq", null as any, "XNAS", "America/New_York");

        expect(isFailure(result)).toBe(true);
        const error = getError(result);
        expect(error.code).toBe("INVALID_STRING_TYPE");
        expect(error.context?.field).toBe("name");
      });

      it("should reject non-string name", () => {
        const result = Exchange.create("nasdaq", 123 as any, "XNAS", "America/New_York");

        expect(isFailure(result)).toBe(true);
        const error = getError(result);
        expect(error.code).toBe("INVALID_STRING_TYPE");
        expect(error.context?.field).toBe("name");
      });
    });

    describe("MIC code validation", () => {
      it("should accept null MIC code", () => {
        const result = Exchange.create("binance", "Binance", null, "UTC");

        expect(isSuccess(result)).toBe(true);
        const exchange = getValue(result);
        expect(exchange.mic).toBe(null);
      });

      it("should accept valid 4-letter MIC codes", () => {
        const validMics = ["XNAS", "XNYS", "XLON", "XTKS", "XHKG", "XPAR", "XFRA", "XSWX", "XASX"];

        for (const mic of validMics) {
          const result = Exchange.create("test", "Test Exchange", mic, "UTC");
          expect(isSuccess(result)).toBe(true);
          const exchange = getValue(result);
          expect(exchange.mic).toBe(mic);
        }
      });

      it("should reject non-string MIC code", () => {
        const result = Exchange.create("nasdaq", "NASDAQ", 123 as any, "America/New_York");

        expect(isFailure(result)).toBe(true);
        const error = getError(result);
        expect(error.code).toBe("INVALID_MIC_TYPE");
        expect(error.message).toContain("MIC code must be a string or null");
        expect(error.context?.type).toBe("number");
      });

      it("should reject empty string MIC code", () => {
        const result = Exchange.create("nasdaq", "NASDAQ", "", "America/New_York");

        expect(isFailure(result)).toBe(true);
        const error = getError(result);
        expect(error.code).toBe("INVALID_MIC_EMPTY");
        expect(error.message).toContain("MIC code cannot be empty");
      });

      it("should reject whitespace-only MIC code", () => {
        const result = Exchange.create("nasdaq", "NASDAQ", "   ", "America/New_York");

        expect(isFailure(result)).toBe(true);
        const error = getError(result);
        expect(error.code).toBe("INVALID_MIC_EMPTY");
      });

      it("should reject MIC codes that are too short", () => {
        const result = Exchange.create("nasdaq", "NASDAQ", "XNA", "America/New_York");

        expect(isFailure(result)).toBe(true);
        const error = getError(result);
        expect(error.code).toBe("INVALID_MIC_FORMAT");
        expect(error.message).toContain("MIC code must be 4 uppercase letters");
        expect(error.context?.expectedFormat).toBe("XXXX (four uppercase letters)");
      });

      it("should reject MIC codes that are too long", () => {
        const result = Exchange.create("nasdaq", "NASDAQ", "XNASD", "America/New_York");

        expect(isFailure(result)).toBe(true);
        const error = getError(result);
        expect(error.code).toBe("INVALID_MIC_FORMAT");
      });

      it("should reject lowercase MIC codes", () => {
        const result = Exchange.create("nasdaq", "NASDAQ", "xnas", "America/New_York");

        expect(isFailure(result)).toBe(true);
        const error = getError(result);
        expect(error.code).toBe("INVALID_MIC_FORMAT");
        expect(error.message).toContain("4 uppercase letters");
      });

      it("should reject mixed case MIC codes", () => {
        const result = Exchange.create("nasdaq", "NASDAQ", "XnAs", "America/New_York");

        expect(isFailure(result)).toBe(true);
        const error = getError(result);
        expect(error.code).toBe("INVALID_MIC_FORMAT");
      });

      it("should reject MIC codes with numbers", () => {
        const result = Exchange.create("nasdaq", "NASDAQ", "XNA1", "America/New_York");

        expect(isFailure(result)).toBe(true);
        const error = getError(result);
        expect(error.code).toBe("INVALID_MIC_FORMAT");
      });

      it("should reject MIC codes with special characters", () => {
        const result = Exchange.create("nasdaq", "NASDAQ", "XNA-", "America/New_York");

        expect(isFailure(result)).toBe(true);
        const error = getError(result);
        expect(error.code).toBe("INVALID_MIC_FORMAT");
      });
    });

    describe("timezone validation", () => {
      it("should accept UTC", () => {
        const result = Exchange.create("binance", "Binance", null, "UTC");

        expect(isSuccess(result)).toBe(true);
        const exchange = getValue(result);
        expect(exchange.timezone).toBe("UTC");
      });

      it("should accept valid IANA timezone identifiers", () => {
        const validTimezones = [
          "America/New_York",
          "Europe/London",
          "Asia/Tokyo",
          "Asia/Hong_Kong",
          "Europe/Paris",
          "Europe/Berlin",
          "America/Chicago",
          "Australia/Sydney",
          "America/Sao_Paulo",
          "Asia/Shanghai",
        ];

        for (const timezone of validTimezones) {
          const result = Exchange.create("test", "Test Exchange", null, timezone);
          expect(isSuccess(result)).toBe(true);
          const exchange = getValue(result);
          expect(exchange.timezone).toBe(timezone);
        }
      });

      it("should reject empty string timezone", () => {
        const result = Exchange.create("nasdaq", "NASDAQ", "XNAS", "");

        expect(isFailure(result)).toBe(true);
        const error = getError(result);
        expect(error.code).toBe("INVALID_STRING_EMPTY");
        expect(error.context?.field).toBe("timezone");
      });

      it("should reject null timezone", () => {
        const result = Exchange.create("nasdaq", "NASDAQ", "XNAS", null as any);

        expect(isFailure(result)).toBe(true);
        const error = getError(result);
        expect(error.code).toBe("INVALID_STRING_TYPE");
        expect(error.context?.field).toBe("timezone");
      });

      it("should reject invalid timezone format", () => {
        const invalidTimezones = ["EST", "PST", "GMT", "invalid", "America", "123", "America/"];

        for (const timezone of invalidTimezones) {
          const result = Exchange.create("nasdaq", "NASDAQ", "XNAS", timezone);
          expect(isFailure(result)).toBe(true);
          const error = getError(result);
          expect(error.code).toBe("INVALID_TIMEZONE_FORMAT");
          expect(error.message).toContain("valid IANA timezone identifier");
          expect(error.context?.expectedFormat).toBe("Region/City or UTC");
        }
      });
    });
  });

  describe("fromDSL() method", () => {
    it("should create Exchange from valid DSL Exchange object", () => {
      const dslExchange: DSL.Exchange = {
        id: "lse",
        name: "London Stock Exchange",
        mic: "XLON",
        timezone: "Europe/London",
      };

      const result = Exchange.fromDSL(dslExchange);

      expect(isSuccess(result)).toBe(true);
      const exchange = getValue(result);
      expect(exchange.id).toBe("lse");
      expect(exchange.name).toBe("London Stock Exchange");
      expect(exchange.mic).toBe("XLON");
      expect(exchange.timezone).toBe("Europe/London");
    });

    it("should create Exchange from DSL object without MIC", () => {
      const dslExchange: DSL.Exchange = {
        id: "binance",
        name: "Binance",
        mic: null,
        timezone: "UTC",
      };

      const result = Exchange.fromDSL(dslExchange);

      expect(isSuccess(result)).toBe(true);
      const exchange = getValue(result);
      expect(exchange.mic).toBe(null);
    });

    it("should fail validation for invalid DSL Exchange object", () => {
      const invalidDslExchange = {
        id: "",
        name: "Invalid Exchange",
        mic: "INVALID",
        timezone: "Invalid/Timezone",
      } as DSL.Exchange;

      const result = Exchange.fromDSL(invalidDslExchange);

      expect(isFailure(result)).toBe(true);
      const error = getError(result);
      expect(error.code).toBe("INVALID_STRING_EMPTY");
    });
  });

  describe("hasMic() method", () => {
    it("should return true when MIC code is present", () => {
      const result = Exchange.create("nasdaq", "NASDAQ", "XNAS", "America/New_York");
      expect(isSuccess(result)).toBe(true);

      const exchange = getValue(result);
      expect(exchange.hasMic()).toBe(true);
    });

    it("should return false when MIC code is null", () => {
      const result = Exchange.create("binance", "Binance", null, "UTC");
      expect(isSuccess(result)).toBe(true);

      const exchange = getValue(result);
      expect(exchange.hasMic()).toBe(false);
    });
  });

  describe("getMic() method", () => {
    it("should return MIC code when available", () => {
      const result = Exchange.create("nasdaq", "NASDAQ", "XNAS", "America/New_York");
      expect(isSuccess(result)).toBe(true);

      const exchange = getValue(result);
      const micResult = exchange.getMic();
      expect(isSuccess(micResult)).toBe(true);
      const mic = getValue(micResult);
      expect(mic).toBe("XNAS");
    });

    it("should return failure when MIC code is not available", () => {
      const result = Exchange.create("binance", "Binance", null, "UTC");
      expect(isSuccess(result)).toBe(true);

      const exchange = getValue(result);
      const micResult = exchange.getMic();
      expect(isFailure(micResult)).toBe(true);
      const error = getError(micResult);
      expect(error.code).toBe("MIC_NOT_AVAILABLE");
      expect(error.message).toContain("Exchange binance does not have a MIC code");
      expect(error.context?.exchangeId).toBe("binance");
      expect(error.context?.name).toBe("Binance");
    });
  });

  describe("isMajorExchange() method", () => {
    it("should return true for major exchanges", () => {
      const majorExchanges = [
        { mic: "XNYS", name: "NYSE" },
        { mic: "XNAS", name: "NASDAQ" },
        { mic: "XLON", name: "London Stock Exchange" },
        { mic: "XTKS", name: "Tokyo Stock Exchange" },
        { mic: "XHKG", name: "Hong Kong Stock Exchange" },
        { mic: "XPAR", name: "Euronext Paris" },
        { mic: "XFRA", name: "Frankfurt Stock Exchange" },
        { mic: "XMIL", name: "Borsa Italiana" },
        { mic: "XAMS", name: "Euronext Amsterdam" },
        { mic: "XSWX", name: "SIX Swiss Exchange" },
        { mic: "XTSE", name: "Toronto Stock Exchange" },
        { mic: "XASX", name: "Australian Securities Exchange" },
      ];

      for (const exchange of majorExchanges) {
        const result = Exchange.create("test", exchange.name, exchange.mic, "UTC");
        expect(isSuccess(result)).toBe(true);
        const exchangeInstance = getValue(result);
        expect(exchangeInstance.isMajorExchange()).toBe(true);
      }
    });

    it("should return false for non-major exchanges", () => {
      const result = Exchange.create("test", "Test Exchange", "XTES", "UTC");
      expect(isSuccess(result)).toBe(true);

      const exchange = getValue(result);
      expect(exchange.isMajorExchange()).toBe(false);
    });

    it("should return false for exchanges without MIC code", () => {
      const result = Exchange.create("binance", "Binance", null, "UTC");
      expect(isSuccess(result)).toBe(true);

      const exchange = getValue(result);
      expect(exchange.isMajorExchange()).toBe(false);
    });
  });

  describe("toString() method", () => {
    it("should return formatted string with MIC code", () => {
      const result = Exchange.create("nasdaq", "NASDAQ", "XNAS", "America/New_York");
      expect(isSuccess(result)).toBe(true);

      const exchange = getValue(result);
      const str = exchange.toString();
      expect(str).toContain("nasdaq");
      expect(str).toContain("NASDAQ");
      expect(str).toContain("XNAS");
      expect(str).toContain("America/New_York");
    });

    it("should return formatted string without MIC code", () => {
      const result = Exchange.create("binance", "Binance", null, "UTC");
      expect(isSuccess(result)).toBe(true);

      const exchange = getValue(result);
      const str = exchange.toString();
      expect(str).toContain("binance");
      expect(str).toContain("Binance");
      expect(str).toContain("UTC");
      expect(str).not.toContain("mic:");
    });
  });

  describe("toObject() method", () => {
    it("should return DSL-compatible object", () => {
      const result = Exchange.create("lse", "London Stock Exchange", "XLON", "Europe/London");
      expect(isSuccess(result)).toBe(true);

      const exchange = getValue(result);
      const obj = exchange.toObject();
      expect(obj.id).toBe("lse");
      expect(obj.name).toBe("London Stock Exchange");
      expect(obj.mic).toBe("XLON");
      expect(obj.timezone).toBe("Europe/London");
    });

    it("should return object that can be used with fromDSL", () => {
      const result1 = Exchange.create("tse", "Tokyo Stock Exchange", "XTKS", "Asia/Tokyo");
      expect(isSuccess(result1)).toBe(true);

      if (isSuccess(result1)) {
        const obj = getValue(result1).toObject();
        const result2 = Exchange.fromDSL(obj);

        expect(isSuccess(result2)).toBe(true);
        if (isSuccess(result2)) {
          const exchange2 = getValue(result2);
          expect(exchange2.id).toBe("tse");
          expect(exchange2.name).toBe("Tokyo Stock Exchange");
          expect(exchange2.mic).toBe("XTKS");
          expect(exchange2.timezone).toBe("Asia/Tokyo");
        }
      }
    });
  });

  describe("real world exchanges", () => {
    it("should handle European exchanges", () => {
      const europeanExchanges = [
        { id: "euronext", name: "Euronext", mic: "XPAR", timezone: "Europe/Paris" },
        { id: "deutsche-boerse", name: "Deutsche Börse", mic: "XFRA", timezone: "Europe/Berlin" },
        { id: "six", name: "SIX Swiss Exchange", mic: "XSWX", timezone: "Europe/Zurich" },
        { id: "borsa-italiana", name: "Borsa Italiana", mic: "XMIL", timezone: "Europe/Rome" },
      ];

      for (const exchange of europeanExchanges) {
        const result = Exchange.create(exchange.id, exchange.name, exchange.mic, exchange.timezone);
        expect(isSuccess(result)).toBe(true);
        const exchangeInstance = getValue(result);
        expect(exchangeInstance.isMajorExchange()).toBe(true);
      }
    });

    it("should handle Asian exchanges", () => {
      const asianExchanges = [
        { id: "sse", name: "Shanghai Stock Exchange", mic: null, timezone: "Asia/Shanghai" },
        { id: "szse", name: "Shenzhen Stock Exchange", mic: null, timezone: "Asia/Shanghai" },
        {
          id: "nse",
          name: "National Stock Exchange of India",
          mic: null,
          timezone: "Asia/Kolkata",
        },
        { id: "krx", name: "Korea Exchange", mic: null, timezone: "Asia/Seoul" },
      ];

      for (const exchange of asianExchanges) {
        const result = Exchange.create(exchange.id, exchange.name, exchange.mic, exchange.timezone);
        expect(isSuccess(result)).toBe(true);
        const exchangeInstance = getValue(result);
        expect(exchangeInstance.hasMic()).toBe(false);
      }
    });

    it("should handle commodity and derivatives exchanges", () => {
      const commodityExchanges = [
        {
          id: "cme",
          name: "Chicago Mercantile Exchange",
          mic: "XCME",
          timezone: "America/Chicago",
        },
        { id: "cbot", name: "Chicago Board of Trade", mic: "XCBT", timezone: "America/Chicago" },
        { id: "ice", name: "Intercontinental Exchange", mic: null, timezone: "America/New_York" },
        { id: "lme", name: "London Metal Exchange", mic: null, timezone: "Europe/London" },
      ];

      for (const exchange of commodityExchanges) {
        const result = Exchange.create(exchange.id, exchange.name, exchange.mic, exchange.timezone);
        expect(isSuccess(result)).toBe(true);
      }
    });
  });

  describe("error handling", () => {
    it("should provide detailed error context for validation failures", () => {
      const result = Exchange.create("", "", "INVALID", "Invalid/Timezone");

      expect(isFailure(result)).toBe(true);
      const error = getError(result);
      expect(error.category).toBe("VALIDATION");
      expect(error.context).toBeDefined();
    });

    it("should maintain error categories consistently", () => {
      const testCases = [
        ["", "Valid Name", "XNAS", "UTC"],
        ["valid-id", "", "XNAS", "UTC"],
        ["valid-id", "Valid Name", "INVALID", "UTC"],
        ["valid-id", "Valid Name", "XNAS", "EST"],
      ];

      for (const [id, name, mic, timezone] of testCases) {
        const result = Exchange.create(id, name, mic, timezone);
        expect(isFailure(result)).toBe(true);
        const error = getError(result);
        expect(error.category).toBe("VALIDATION");
      }
    });
  });
});

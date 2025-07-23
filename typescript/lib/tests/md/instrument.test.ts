/**
 * Tests for Instrument smart constructor
 * Uses real market data examples - no mocks or stubs
 */

import { getError, getValue, isFailure, isSuccess } from "@qi/base";
import { describe, expect, it } from "vitest";
import type * as DSL from "../../src/dsl/index.js";
import { Instrument } from "../../src/md/instrument.js";

describe("Instrument Smart Constructor", () => {
  describe("create() method", () => {
    it("should create valid stock instrument with ISIN", () => {
      const result = Instrument.create("AAPL", "US0378331005", "Apple Inc", "STOCK", "USD");

      expect(isSuccess(result)).toBe(true);
      const instrument = getValue(result);
      expect(instrument.symbol).toBe("AAPL");
      expect(instrument.isin).toBe("US0378331005");
      expect(instrument.name).toBe("Apple Inc");
      expect(instrument.assetClass).toBe("STOCK");
      expect(instrument.currency).toBe("USD");
    });

    it("should create valid crypto instrument without ISIN", () => {
      const result = Instrument.create("BTC/USD", null, "Bitcoin/US Dollar", "CRYPTO", "USD");

      expect(isSuccess(result)).toBe(true);
      const instrument = getValue(result);
      expect(instrument.symbol).toBe("BTC/USD");
      expect(instrument.isin).toBe(null);
      expect(instrument.name).toBe("Bitcoin/US Dollar");
      expect(instrument.assetClass).toBe("CRYPTO");
      expect(instrument.currency).toBe("USD");
    });

    it("should create valid instruments for all asset classes", () => {
      const instruments = [
        {
          symbol: "MSFT",
          isin: "US5949181045",
          name: "Microsoft Corporation",
          assetClass: "STOCK" as DSL.AssetClass,
          currency: "USD",
        },
        {
          symbol: "ETH/USD",
          isin: null,
          name: "Ethereum/US Dollar",
          assetClass: "CRYPTO" as DSL.AssetClass,
          currency: "USD",
        },
        {
          symbol: "EUR/USD",
          isin: null,
          name: "Euro/US Dollar",
          assetClass: "CURRENCY" as DSL.AssetClass,
          currency: "USD",
        },
        {
          symbol: "GC=F",
          isin: null,
          name: "Gold Futures",
          assetClass: "COMMODITY" as DSL.AssetClass,
          currency: "USD",
        },
        {
          symbol: "US10Y",
          isin: "US912810RR07",
          name: "US 10-Year Treasury",
          assetClass: "BOND" as DSL.AssetClass,
          currency: "USD",
        },
        {
          symbol: "SPX",
          isin: null,
          name: "S&P 500 Index",
          assetClass: "INDEX" as DSL.AssetClass,
          currency: "USD",
        },
      ];

      for (const instrument of instruments) {
        const result = Instrument.create(
          instrument.symbol,
          instrument.isin,
          instrument.name,
          instrument.assetClass,
          instrument.currency
        );
        expect(isSuccess(result)).toBe(true);
        const instrumentInstance = getValue(result);
        expect(instrumentInstance.assetClass).toBe(instrument.assetClass);
        expect(instrumentInstance.symbol).toBe(instrument.symbol);
      }
    });

    it("should create valid instruments with international data", () => {
      const internationalInstruments = [
        {
          symbol: "7203",
          isin: "JP3633400001",
          name: "Toyota Motor Corporation",
          assetClass: "STOCK" as DSL.AssetClass,
          currency: "JPY",
        },
        {
          symbol: "BARC",
          isin: "GB0031348658",
          name: "Barclays PLC",
          assetClass: "STOCK" as DSL.AssetClass,
          currency: "GBP",
        },
        {
          symbol: "SAP",
          isin: "DE0007164600",
          name: "SAP SE",
          assetClass: "STOCK" as DSL.AssetClass,
          currency: "EUR",
        },
        {
          symbol: "0700",
          isin: "KYG875721634",
          name: "Tencent Holdings Ltd",
          assetClass: "STOCK" as DSL.AssetClass,
          currency: "HKD",
        },
        {
          symbol: "GBP/USD",
          isin: null,
          name: "British Pound/US Dollar",
          assetClass: "CURRENCY" as DSL.AssetClass,
          currency: "USD",
        },
      ];

      for (const instrument of internationalInstruments) {
        const result = Instrument.create(
          instrument.symbol,
          instrument.isin,
          instrument.name,
          instrument.assetClass,
          instrument.currency
        );
        expect(isSuccess(result)).toBe(true);
        const instrumentInstance = getValue(result);
        expect(instrumentInstance.currency).toBe(instrument.currency);
        if (instrument.isin) {
          expect(instrumentInstance.isin).toBe(instrument.isin);
        }
      }
    });

    describe("symbol validation", () => {
      it("should reject empty string symbol", () => {
        const result = Instrument.create("", "US0378331005", "Apple Inc", "STOCK", "USD");

        expect(isFailure(result)).toBe(true);
        const error = getError(result);
        expect(error.code).toBe("INVALID_STRING_EMPTY");
        expect(error.context?.field).toBe("symbol");
      });

      it("should reject whitespace-only symbol", () => {
        const result = Instrument.create("   ", "US0378331005", "Apple Inc", "STOCK", "USD");

        expect(isFailure(result)).toBe(true);
        const error = getError(result);
        expect(error.code).toBe("INVALID_STRING_EMPTY");
        expect(error.context?.field).toBe("symbol");
      });

      it("should reject null symbol", () => {
        const result = Instrument.create(null as any, "US0378331005", "Apple Inc", "STOCK", "USD");

        expect(isFailure(result)).toBe(true);
        const error = getError(result);
        expect(error.code).toBe("INVALID_STRING_TYPE");
        expect(error.context?.field).toBe("symbol");
        expect(error.context?.type).toBe("object");
      });

      it("should reject non-string symbol", () => {
        const result = Instrument.create(123 as any, "US0378331005", "Apple Inc", "STOCK", "USD");

        expect(isFailure(result)).toBe(true);
        const error = getError(result);
        expect(error.code).toBe("INVALID_STRING_TYPE");
        expect(error.context?.field).toBe("symbol");
      });
    });

    describe("ISIN validation", () => {
      it("should accept null ISIN", () => {
        const result = Instrument.create("BTC/USD", null, "Bitcoin/US Dollar", "CRYPTO", "USD");

        expect(isSuccess(result)).toBe(true);
        const instrument = getValue(result);
        expect(instrument.isin).toBe(null);
      });

      it("should accept valid ISINs", () => {
        const validIsins = [
          "US0378331005", // Apple
          "US5949181045", // Microsoft
          "GB0031348658", // Barclays
          "JP3633400001", // Toyota
          "DE0007164600", // SAP
          "KYG875721634", // Tencent
          "FR0000120271", // TotalEnergies
          "NL0000235190", // Airbus
          "CH0012032048", // Roche
          "IT0003132476", // Enel
        ];

        for (const isin of validIsins) {
          const result = Instrument.create("TEST", isin, "Test Instrument", "STOCK", "USD");
          expect(isSuccess(result)).toBe(true);
          const instrument = getValue(result);
          expect(instrument.isin).toBe(isin);
        }
      });

      it("should reject non-string ISIN", () => {
        const result = Instrument.create("AAPL", 123 as any, "Apple Inc", "STOCK", "USD");

        expect(isFailure(result)).toBe(true);
        const error = getError(result);
        expect(error.code).toBe("INVALID_ISIN_TYPE");
        expect(error.message).toContain("ISIN must be a string or null");
      });

      it("should reject empty string ISIN", () => {
        const result = Instrument.create("AAPL", "", "Apple Inc", "STOCK", "USD");

        expect(isFailure(result)).toBe(true);
        const error = getError(result);
        expect(error.code).toBe("INVALID_ISIN_EMPTY");
        expect(error.message).toContain("ISIN cannot be empty");
      });

      it("should reject whitespace-only ISIN", () => {
        const result = Instrument.create("AAPL", "   ", "Apple Inc", "STOCK", "USD");

        expect(isFailure(result)).toBe(true);
        const error = getError(result);
        expect(error.code).toBe("INVALID_ISIN_EMPTY");
      });

      it("should reject ISIN with wrong length", () => {
        const invalidLengthIsins = ["US037833100", "US03783310055", "SHORT", "TOOLONGFORMATISIN"];

        for (const isin of invalidLengthIsins) {
          const result = Instrument.create("AAPL", isin, "Apple Inc", "STOCK", "USD");
          expect(isFailure(result)).toBe(true);
          const error = getError(result);
          expect(error.code).toBe("INVALID_ISIN_FORMAT");
          expect(error.message).toContain("ISIN must be 12 characters");
        }
      });

      it("should reject ISIN with invalid format", () => {
        const invalidFormatIsins = [
          "us0378331005", // lowercase country code
          "U10378331005", // invalid country code format
          "US037833100A", // invalid check digit (should be number)
          "US037833-005", // invalid character
          "1S0378331005", // number in country code
        ];

        for (const isin of invalidFormatIsins) {
          const result = Instrument.create("AAPL", isin, "Apple Inc", "STOCK", "USD");
          expect(isFailure(result)).toBe(true);
          const error = getError(result);
          expect(error.code).toBe("INVALID_ISIN_FORMAT");
          expect(error.context?.expectedFormat).toBe(
            "CCNNNNNNNND (C=country, N=alphanumeric, D=digit)"
          );
        }
      });
    });

    describe("name validation", () => {
      it("should reject empty string name", () => {
        const result = Instrument.create("AAPL", "US0378331005", "", "STOCK", "USD");

        expect(isFailure(result)).toBe(true);
        const error = getError(result);
        expect(error.code).toBe("INVALID_STRING_EMPTY");
        expect(error.context?.field).toBe("name");
      });

      it("should reject null name", () => {
        const result = Instrument.create("AAPL", "US0378331005", null as any, "STOCK", "USD");

        expect(isFailure(result)).toBe(true);
        const error = getError(result);
        expect(error.code).toBe("INVALID_STRING_TYPE");
        expect(error.context?.field).toBe("name");
      });

      it("should reject non-string name", () => {
        const result = Instrument.create("AAPL", "US0378331005", 123 as any, "STOCK", "USD");

        expect(isFailure(result)).toBe(true);
        const error = getError(result);
        expect(error.code).toBe("INVALID_STRING_TYPE");
      });
    });

    describe("asset class validation", () => {
      it("should accept all valid asset classes", () => {
        const validAssetClasses: DSL.AssetClass[] = [
          "STOCK",
          "CRYPTO",
          "CURRENCY",
          "COMMODITY",
          "BOND",
          "INDEX",
        ];

        for (const assetClass of validAssetClasses) {
          const result = Instrument.create("TEST", null, "Test Instrument", assetClass, "USD");
          expect(isSuccess(result)).toBe(true);
          const instrument = getValue(result);
          expect(instrument.assetClass).toBe(assetClass);
        }
      });

      it("should reject invalid asset class", () => {
        const result = Instrument.create("TEST", null, "Test Instrument", "INVALID" as any, "USD");

        expect(isFailure(result)).toBe(true);
        const error = getError(result);
        expect(error.code).toBe("INVALID_ASSET_CLASS");
        expect(error.message).toContain(
          "Asset class must be one of: STOCK, CRYPTO, CURRENCY, COMMODITY, BOND, INDEX"
        );
        expect(error.context?.validValues).toEqual([
          "STOCK",
          "CRYPTO",
          "CURRENCY",
          "COMMODITY",
          "BOND",
          "INDEX",
        ]);
      });

      it("should reject null asset class", () => {
        const result = Instrument.create("TEST", null, "Test Instrument", null as any, "USD");

        expect(isFailure(result)).toBe(true);
        const error = getError(result);
        expect(error.code).toBe("INVALID_ASSET_CLASS");
      });

      it("should reject lowercase asset class", () => {
        const result = Instrument.create("TEST", null, "Test Instrument", "stock" as any, "USD");

        expect(isFailure(result)).toBe(true);
        const error = getError(result);
        expect(error.code).toBe("INVALID_ASSET_CLASS");
      });
    });

    describe("currency validation", () => {
      it("should accept valid currency codes", () => {
        const validCurrencies = [
          "USD",
          "EUR",
          "GBP",
          "JPY",
          "CHF",
          "CAD",
          "AUD",
          "CNY",
          "HKD",
          "SGD",
        ];

        for (const currency of validCurrencies) {
          const result = Instrument.create("TEST", null, "Test Instrument", "STOCK", currency);
          expect(isSuccess(result)).toBe(true);
          const instrument = getValue(result);
          expect(instrument.currency).toBe(currency);
        }
      });

      it("should reject empty string currency", () => {
        const result = Instrument.create("AAPL", "US0378331005", "Apple Inc", "STOCK", "");

        expect(isFailure(result)).toBe(true);
        const error = getError(result);
        expect(error.code).toBe("INVALID_STRING_EMPTY");
        expect(error.context?.field).toBe("currency");
      });

      it("should reject null currency", () => {
        const result = Instrument.create("AAPL", "US0378331005", "Apple Inc", "STOCK", null as any);

        expect(isFailure(result)).toBe(true);
        const error = getError(result);
        expect(error.code).toBe("INVALID_STRING_TYPE");
        expect(error.context?.field).toBe("currency");
      });

      it("should reject invalid currency format", () => {
        const invalidCurrencies = ["usd", "US", "USDD", "123", "US$"];

        for (const currency of invalidCurrencies) {
          const result = Instrument.create("TEST", null, "Test Instrument", "STOCK", currency);
          expect(isFailure(result)).toBe(true);
          const error = getError(result);
          expect(error.code).toBe("INVALID_CURRENCY_FORMAT");
          expect(error.message).toContain("Currency must be a 3-letter ISO 4217 currency code");
          expect(error.context?.expectedFormat).toBe("XXX (three uppercase letters)");
        }
      });
    });
  });

  describe("fromDSL() method", () => {
    it("should create Instrument from valid DSL Instrument object", () => {
      const dslInstrument: DSL.Instrument = {
        symbol: "GOOGL",
        isin: "US02079K3059",
        name: "Alphabet Inc Class A",
        assetClass: "STOCK",
        currency: "USD",
      };

      const result = Instrument.fromDSL(dslInstrument);

      expect(isSuccess(result)).toBe(true);
      const instrument = getValue(result);
      expect(instrument.symbol).toBe("GOOGL");
      expect(instrument.isin).toBe("US02079K3059");
      expect(instrument.name).toBe("Alphabet Inc Class A");
      expect(instrument.assetClass).toBe("STOCK");
      expect(instrument.currency).toBe("USD");
    });

    it("should create Instrument from DSL object without ISIN", () => {
      const dslInstrument: DSL.Instrument = {
        symbol: "BTC/USD",
        isin: null,
        name: "Bitcoin/US Dollar",
        assetClass: "CRYPTO",
        currency: "USD",
      };

      const result = Instrument.fromDSL(dslInstrument);

      expect(isSuccess(result)).toBe(true);
      const instrument = getValue(result);
      expect(instrument.isin).toBe(null);
      expect(instrument.assetClass).toBe("CRYPTO");
    });

    it("should fail validation for invalid DSL Instrument object", () => {
      const invalidDslInstrument = {
        symbol: "",
        isin: "INVALID",
        name: "Invalid Instrument",
        assetClass: "INVALID",
        currency: "INVALID",
      } as DSL.Instrument;

      const result = Instrument.fromDSL(invalidDslInstrument);

      expect(isFailure(result)).toBe(true);
      const error = getError(result);
      expect(error.code).toBe("INVALID_STRING_EMPTY");
    });
  });

  describe("hasIsin() method", () => {
    it("should return true when ISIN is present", () => {
      const result = Instrument.create("AAPL", "US0378331005", "Apple Inc", "STOCK", "USD");
      expect(isSuccess(result)).toBe(true);

      const instrument = getValue(result);
      expect(instrument.hasIsin()).toBe(true);
    });

    it("should return false when ISIN is null", () => {
      const result = Instrument.create("BTC/USD", null, "Bitcoin/US Dollar", "CRYPTO", "USD");
      expect(isSuccess(result)).toBe(true);

      const instrument = getValue(result);
      expect(instrument.hasIsin()).toBe(false);
    });
  });

  describe("getIsin() method", () => {
    it("should return ISIN when available", () => {
      const result = Instrument.create("AAPL", "US0378331005", "Apple Inc", "STOCK", "USD");
      expect(isSuccess(result)).toBe(true);

      const instrument = getValue(result);
      const isinResult = instrument.getIsin();
      expect(isSuccess(isinResult)).toBe(true);
      const isin = getValue(isinResult);
      expect(isin).toBe("US0378331005");
    });

    it("should return failure when ISIN is not available", () => {
      const result = Instrument.create("BTC/USD", null, "Bitcoin/US Dollar", "CRYPTO", "USD");
      expect(isSuccess(result)).toBe(true);

      const instrument = getValue(result);
      const isinResult = instrument.getIsin();
      expect(isFailure(isinResult)).toBe(true);
      const error = getError(isinResult);
      expect(error.code).toBe("ISIN_NOT_AVAILABLE");
      expect(error.message).toContain("Instrument BTC/USD does not have an ISIN");
      expect(error.context?.symbol).toBe("BTC/USD");
      expect(error.context?.assetClass).toBe("CRYPTO");
    });
  });

  describe("asset class methods", () => {
    it("should correctly identify stock instruments", () => {
      const result = Instrument.create("AAPL", "US0378331005", "Apple Inc", "STOCK", "USD");
      expect(isSuccess(result)).toBe(true);

      const instrument = getValue(result);
      expect(instrument.isStock()).toBe(true);
      expect(instrument.isCrypto()).toBe(false);
      expect(instrument.isCurrency()).toBe(false);
      expect(instrument.isCommodity()).toBe(false);
      expect(instrument.isBond()).toBe(false);
      expect(instrument.isIndex()).toBe(false);
    });

    it("should correctly identify crypto instruments", () => {
      const result = Instrument.create("BTC/USD", null, "Bitcoin/US Dollar", "CRYPTO", "USD");
      expect(isSuccess(result)).toBe(true);

      const instrument = getValue(result);
      expect(instrument.isCrypto()).toBe(true);
      expect(instrument.isStock()).toBe(false);
    });

    it("should correctly identify currency instruments", () => {
      const result = Instrument.create("EUR/USD", null, "Euro/US Dollar", "CURRENCY", "USD");
      expect(isSuccess(result)).toBe(true);

      const instrument = getValue(result);
      expect(instrument.isCurrency()).toBe(true);
      expect(instrument.isStock()).toBe(false);
    });

    it("should correctly identify commodity instruments", () => {
      const result = Instrument.create("GC=F", null, "Gold Futures", "COMMODITY", "USD");
      expect(isSuccess(result)).toBe(true);

      const instrument = getValue(result);
      expect(instrument.isCommodity()).toBe(true);
      expect(instrument.isStock()).toBe(false);
    });

    it("should correctly identify bond instruments", () => {
      const result = Instrument.create(
        "US10Y",
        "US912810RR07",
        "US 10-Year Treasury",
        "BOND",
        "USD"
      );
      expect(isSuccess(result)).toBe(true);

      const instrument = getValue(result);
      expect(instrument.isBond()).toBe(true);
      expect(instrument.isStock()).toBe(false);
    });

    it("should correctly identify index instruments", () => {
      const result = Instrument.create("SPX", null, "S&P 500 Index", "INDEX", "USD");
      expect(isSuccess(result)).toBe(true);

      const instrument = getValue(result);
      expect(instrument.isIndex()).toBe(true);
      expect(instrument.isStock()).toBe(false);
    });
  });

  describe("getIsinCountryCode() method", () => {
    it("should return country code when ISIN is available", () => {
      const testCases = [
        { isin: "US0378331005", expectedCountry: "US" },
        { isin: "GB0031348658", expectedCountry: "GB" },
        { isin: "JP3633400001", expectedCountry: "JP" },
        { isin: "DE0007164600", expectedCountry: "DE" },
        { isin: "FR0000120271", expectedCountry: "FR" },
      ];

      for (const testCase of testCases) {
        const result = Instrument.create("TEST", testCase.isin, "Test Instrument", "STOCK", "USD");
        expect(isSuccess(result)).toBe(true);
        const instrument = getValue(result);
        expect(instrument.getIsinCountryCode()).toBe(testCase.expectedCountry);
      }
    });

    it("should return null when ISIN is not available", () => {
      const result = Instrument.create("BTC/USD", null, "Bitcoin/US Dollar", "CRYPTO", "USD");
      expect(isSuccess(result)).toBe(true);

      const instrument = getValue(result);
      expect(instrument.getIsinCountryCode()).toBe(null);
    });
  });

  describe("toString() method", () => {
    it("should return formatted string with ISIN", () => {
      const result = Instrument.create("AAPL", "US0378331005", "Apple Inc", "STOCK", "USD");
      expect(isSuccess(result)).toBe(true);

      const instrument = getValue(result);
      const str = instrument.toString();
      expect(str).toContain("AAPL");
      expect(str).toContain("Apple Inc");
      expect(str).toContain("STOCK");
      expect(str).toContain("USD");
      expect(str).toContain("US0378331005");
    });

    it("should return formatted string without ISIN", () => {
      const result = Instrument.create("BTC/USD", null, "Bitcoin/US Dollar", "CRYPTO", "USD");
      expect(isSuccess(result)).toBe(true);

      const instrument = getValue(result);
      const str = instrument.toString();
      expect(str).toContain("BTC/USD");
      expect(str).toContain("CRYPTO");
      expect(str).not.toContain("isin:");
    });
  });

  describe("toObject() method", () => {
    it("should return DSL-compatible object", () => {
      const result = Instrument.create(
        "MSFT",
        "US5949181045",
        "Microsoft Corporation",
        "STOCK",
        "USD"
      );
      expect(isSuccess(result)).toBe(true);

      const instrument = getValue(result);
      const obj = instrument.toObject();
      expect(obj.symbol).toBe("MSFT");
      expect(obj.isin).toBe("US5949181045");
      expect(obj.name).toBe("Microsoft Corporation");
      expect(obj.assetClass).toBe("STOCK");
      expect(obj.currency).toBe("USD");
    });

    it("should return object that can be used with fromDSL", () => {
      const result1 = Instrument.create(
        "GOOGL",
        "US02079K3059",
        "Alphabet Inc Class A",
        "STOCK",
        "USD"
      );
      expect(isSuccess(result1)).toBe(true);

      const instrument1 = getValue(result1);
      const obj = instrument1.toObject();
      const result2 = Instrument.fromDSL(obj);

      expect(isSuccess(result2)).toBe(true);
      const instrument2 = getValue(result2);
      expect(instrument2.symbol).toBe("GOOGL");
      expect(instrument2.isin).toBe("US02079K3059");
      expect(instrument2.name).toBe("Alphabet Inc Class A");
      expect(instrument2.assetClass).toBe("STOCK");
      expect(instrument2.currency).toBe("USD");
    });
  });

  describe("real world instruments", () => {
    it("should handle major US stocks", () => {
      const usStocks = [
        { symbol: "AMZN", isin: "US0231351067", name: "Amazon.com Inc", currency: "USD" },
        { symbol: "TSLA", isin: "US88160R1014", name: "Tesla Inc", currency: "USD" },
        { symbol: "META", isin: "US30303M1027", name: "Meta Platforms Inc", currency: "USD" },
        { symbol: "NVDA", isin: "US67066G1040", name: "NVIDIA Corporation", currency: "USD" },
        { symbol: "NFLX", isin: "US64110L1061", name: "Netflix Inc", currency: "USD" },
      ];

      for (const stock of usStocks) {
        const result = Instrument.create(
          stock.symbol,
          stock.isin,
          stock.name,
          "STOCK",
          stock.currency
        );
        expect(isSuccess(result)).toBe(true);
        const instrument = getValue(result);
        expect(instrument.isStock()).toBe(true);
        expect(instrument.getIsinCountryCode()).toBe("US");
      }
    });

    it("should handle major cryptocurrencies", () => {
      const cryptos = [
        { symbol: "BTC/USD", name: "Bitcoin/US Dollar" },
        { symbol: "ETH/USD", name: "Ethereum/US Dollar" },
        { symbol: "ADA/USD", name: "Cardano/US Dollar" },
        { symbol: "DOT/USD", name: "Polkadot/US Dollar" },
        { symbol: "LINK/USD", name: "Chainlink/US Dollar" },
      ];

      for (const crypto of cryptos) {
        const result = Instrument.create(crypto.symbol, null, crypto.name, "CRYPTO", "USD");
        expect(isSuccess(result)).toBe(true);
        const instrument = getValue(result);
        expect(instrument.isCrypto()).toBe(true);
        expect(instrument.hasIsin()).toBe(false);
      }
    });

    it("should handle major forex pairs", () => {
      const forexPairs = [
        { symbol: "EUR/USD", name: "Euro/US Dollar", currency: "USD" },
        { symbol: "GBP/USD", name: "British Pound/US Dollar", currency: "USD" },
        { symbol: "USD/JPY", name: "US Dollar/Japanese Yen", currency: "JPY" },
        { symbol: "USD/CHF", name: "US Dollar/Swiss Franc", currency: "CHF" },
        { symbol: "AUD/USD", name: "Australian Dollar/US Dollar", currency: "USD" },
      ];

      for (const pair of forexPairs) {
        const result = Instrument.create(pair.symbol, null, pair.name, "CURRENCY", pair.currency);
        expect(isSuccess(result)).toBe(true);
        const instrument = getValue(result);
        expect(instrument.isCurrency()).toBe(true);
        expect(instrument.currency).toBe(pair.currency);
      }
    });
  });

  describe("error handling", () => {
    it("should provide detailed error context for validation failures", () => {
      const result = Instrument.create("", "INVALID", "", "INVALID" as any, "");

      expect(isFailure(result)).toBe(true);
      const error = getError(result);
      expect(error.category).toBe("VALIDATION");
      expect(error.context).toBeDefined();
    });

    it("should maintain error categories consistently", () => {
      const testCases = [
        ["", "US0378331005", "Apple Inc", "STOCK", "USD"],
        ["AAPL", "INVALID", "Apple Inc", "STOCK", "USD"],
        ["AAPL", "US0378331005", "", "STOCK", "USD"],
        ["AAPL", "US0378331005", "Apple Inc", "INVALID" as any, "USD"],
        ["AAPL", "US0378331005", "Apple Inc", "STOCK", ""],
      ];

      for (const [symbol, isin, name, assetClass, currency] of testCases) {
        const result = Instrument.create(symbol, isin, name, assetClass, currency);
        expect(isFailure(result)).toBe(true);
        const error = getError(result);
        expect(error.category).toBe("VALIDATION");
      }
    });
  });
});

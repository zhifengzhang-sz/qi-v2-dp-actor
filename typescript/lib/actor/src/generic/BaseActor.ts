import { create, Err, flatMap, Ok, type Result } from "@qi/base";
import type * as DSL from "@qi/dp/dsl";

/**
 * Base abstract class for all actors providing shared functionality:
 * - Constructor with DataContext
 * - Context Manager implementation (MarketDataContextManager contract)
 * - Workflow abstraction following @qi/base functional patterns
 */
export abstract class BaseActor implements DSL.MarketDataContextManager {
  constructor(protected context: DSL.DataContext) {}

  // Context Manager Contract (DSL Part II) - implemented in base class
  async createContext(
    market: DSL.Market,
    exchange: DSL.Exchange,
    instrument: DSL.Instrument,
  ): Promise<Result<DSL.DataContext>> {
    // Simple context creation - validate inputs then create
    if (!market || !exchange || !instrument) {
      return Err(
        create("CONTEXT_CREATION_ERROR", "Missing required context components", "VALIDATION", {
          hasMarket: !!market,
          hasExchange: !!exchange,
          hasInstrument: !!instrument,
        }),
      );
    }

    return Ok({
      market,
      exchange,
      instrument,
    });
  }

  async getContext(_query: DSL.ContextQuery): Promise<Result<DSL.DataContext[]>> {
    // Basic implementation - return current context
    // Concrete classes should override with proper query handling
    return Ok([this.context]);
  }

  async updateMarket(
    context: DSL.DataContext,
    market: DSL.Market,
  ): Promise<Result<DSL.DataContext>> {
    if (!market) {
      return Err(
        create("CONTEXT_UPDATE_ERROR", "Market cannot be null or undefined", "VALIDATION", {
          originalContext: context,
        }),
      );
    }
    return Ok({ ...context, market });
  }

  async updateExchange(
    context: DSL.DataContext,
    exchange: DSL.Exchange,
  ): Promise<Result<DSL.DataContext>> {
    if (!exchange) {
      return Err(
        create("CONTEXT_UPDATE_ERROR", "Exchange cannot be null or undefined", "VALIDATION", {
          originalContext: context,
        }),
      );
    }
    return Ok({ ...context, exchange });
  }

  async updateInstrument(
    context: DSL.DataContext,
    instrument: DSL.Instrument,
  ): Promise<Result<DSL.DataContext>> {
    if (!instrument) {
      return Err(
        create("CONTEXT_UPDATE_ERROR", "Instrument cannot be null or undefined", "VALIDATION", {
          originalContext: context,
        }),
      );
    }
    return Ok({ ...context, instrument });
  }

  async validateContext(context: DSL.DataContext): Promise<Result<void>> {
    if (!context.market || !context.exchange || !context.instrument) {
      return Err(
        create(
          "CONTEXT_VALIDATION_ERROR",
          "Invalid context: missing required fields",
          "VALIDATION",
          {
            hasMarket: !!context.market,
            hasExchange: !!context.exchange,
            hasInstrument: !!context.instrument,
          },
        ),
      );
    }
    return Ok(undefined);
  }

  // Workflow abstraction using pure @qi/base functional patterns
  protected async workflow<T>(
    handlerPromise: Promise<Result<T>>,
    errorType: string,
    operationContext: Record<string, unknown> = {},
  ): Promise<Result<T>> {
    return flatMap(
      (result) => Ok(result), // Pass through successful results
      await handlerPromise.catch((error) => {
        // Convert Promise rejections to Result failures using @qi/base
        const errorMessage = error instanceof Error ? error.message : String(error);
        return Err(
          create(errorType, `Operation failed: ${errorMessage}`, "SYSTEM", {
            context: this.context,
            operationContext,
            originalError: errorMessage,
            timestamp: new Date().toISOString(),
          }),
        );
      }),
    );
  }
}

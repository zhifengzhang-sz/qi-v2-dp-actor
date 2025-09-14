/**
 * Shared validation utilities for smart constructors
 * Implements: docs/md/impl.marketdata.md validation strategy
 */

import type { Result } from "@qi/base";
import { create, Err, flatMap, Ok } from "@qi/base";

/**
 * Validates ISO 8601 timestamp string
 */
export const isValidTimestamp = (timestamp: string): Result<string> => {
  if (typeof timestamp !== "string" || timestamp.trim() === "") {
    return Err(
      create("INVALID_TIMESTAMP", "Timestamp must be a non-empty string", "VALIDATION", {
        value: timestamp,
      }),
    );
  }

  try {
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) {
      return Err(
        create(
          "INVALID_TIMESTAMP_FORMAT",
          "Timestamp must be valid ISO 8601 format",
          "VALIDATION",
          { value: timestamp },
        ),
      );
    }
    return Ok(timestamp);
  } catch (error) {
    return Err(
      create("INVALID_TIMESTAMP_PARSE", "Failed to parse timestamp", "VALIDATION", {
        value: timestamp,
        error: String(error),
      }),
    );
  }
};

/**
 * Validates positive finite number (for prices, sizes)
 */
export const isPositiveFiniteNumber = (value: unknown, fieldName: string): Result<number> => {
  let numericValue: unknown = value;

  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isNaN(parsed)) {
      return Err(
        create("INVALID_NUMBER_FORMAT", `${fieldName} must be a valid number`, "VALIDATION", {
          field: fieldName,
          value,
        }),
      );
    }
    numericValue = parsed;
  }

  if (typeof numericValue !== "number") {
    return Err(
      create("INVALID_NUMBER_TYPE", `${fieldName} must be a number`, "VALIDATION", {
        field: fieldName,
        value,
        type: typeof numericValue,
      }),
    );
  }

  if (!Number.isFinite(numericValue)) {
    return Err(
      create(
        "INVALID_NUMBER_FINITE",
        `${fieldName} must be finite (no NaN or Infinity)`,
        "VALIDATION",
        { field: fieldName, value: numericValue },
      ),
    );
  }

  if (numericValue <= 0) {
    return Err(
      create("INVALID_NUMBER_POSITIVE", `${fieldName} must be positive`, "VALIDATION", {
        field: fieldName,
        value: numericValue,
      }),
    );
  }

  return Ok(numericValue);
};

/**
 * Validates non-negative finite number (for volumes)
 */
export const isNonNegativeFiniteNumber = (value: unknown, fieldName: string): Result<number> => {
  let numericValue: unknown = value;

  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isNaN(parsed)) {
      return Err(
        create("INVALID_NUMBER_FORMAT", `${fieldName} must be a valid number`, "VALIDATION", {
          field: fieldName,
          value,
        }),
      );
    }
    numericValue = parsed;
  }

  if (typeof numericValue !== "number") {
    return Err(
      create("INVALID_NUMBER_TYPE", `${fieldName} must be a number`, "VALIDATION", {
        field: fieldName,
        value,
        type: typeof numericValue,
      }),
    );
  }

  if (!Number.isFinite(numericValue)) {
    return Err(
      create(
        "INVALID_NUMBER_FINITE",
        `${fieldName} must be finite (no NaN or Infinity)`,
        "VALIDATION",
        { field: fieldName, value: numericValue },
      ),
    );
  }

  if (numericValue < 0) {
    return Err(
      create("INVALID_NUMBER_NON_NEGATIVE", `${fieldName} must be non-negative`, "VALIDATION", {
        field: fieldName,
        value: numericValue,
      }),
    );
  }

  return Ok(numericValue);
};

/**
 * Validates decimal string format
 */
export const isValidDecimal = (value: string, fieldName: string): Result<string> => {
  if (typeof value !== "string") {
    return Err(
      create("INVALID_DECIMAL_TYPE", `${fieldName} must be a string`, "VALIDATION", {
        field: fieldName,
        value,
        type: typeof value,
      }),
    );
  }

  if (value.trim() === "") {
    return Err(
      create("INVALID_DECIMAL_EMPTY", `${fieldName} cannot be empty`, "VALIDATION", {
        field: fieldName,
        value,
      }),
    );
  }

  // Enhanced validation: Check for valid decimal format before parsing
  const trimmedValue = value.trim();

  // Check for valid decimal pattern (optional sign, digits, optional decimal point and digits)
  const decimalPattern = /^[+-]?(\d+(\.\d*)?|\.\d+)([eE][+-]?\d+)?$/;
  if (!decimalPattern.test(trimmedValue)) {
    return Err(
      create(
        "INVALID_DECIMAL_PATTERN",
        `${fieldName} must be a valid decimal format`,
        "VALIDATION",
        { field: fieldName, value, pattern: "number format" },
      ),
    );
  }

  const parsed = Number(trimmedValue);
  if (Number.isNaN(parsed)) {
    return Err(
      create(
        "INVALID_DECIMAL_FORMAT",
        `${fieldName} must be a valid decimal number`,
        "VALIDATION",
        { field: fieldName, value },
      ),
    );
  }

  if (!Number.isFinite(parsed)) {
    return Err(
      create("INVALID_DECIMAL_FINITE", `${fieldName} must be finite`, "VALIDATION", {
        field: fieldName,
        value,
      }),
    );
  }

  // Additional check for extremely large/small numbers that might cause precision issues
  if (Math.abs(parsed) > Number.MAX_SAFE_INTEGER) {
    return Err(
      create(
        "INVALID_DECIMAL_PRECISION",
        `${fieldName} exceeds safe precision range`,
        "VALIDATION",
        {
          field: fieldName,
          value,
          maxSafeInteger: Number.MAX_SAFE_INTEGER,
        },
      ),
    );
  }

  return Ok(trimmedValue);
};

/**
 * Validates positive decimal string
 */
export const isPositiveDecimal = (value: string, fieldName: string): Result<string> => {
  return flatMap(
    (validDecimal) => {
      const numValue = Number(validDecimal);
      if (numValue <= 0) {
        return Err(
          create("INVALID_DECIMAL_POSITIVE", `${fieldName} must be positive`, "VALIDATION", {
            field: fieldName,
            value,
          }),
        );
      }
      return Ok(validDecimal);
    },
    isValidDecimal(value, fieldName),
  );
};

/**
 * Validates non-negative decimal string
 */
export const isNonNegativeDecimal = (value: string, fieldName: string): Result<string> => {
  return flatMap(
    (validDecimal) => {
      const numValue = Number(validDecimal);
      if (numValue < 0) {
        return Err(
          create(
            "INVALID_DECIMAL_NON_NEGATIVE",
            `${fieldName} must be non-negative`,
            "VALIDATION",
            {
              field: fieldName,
              value,
            },
          ),
        );
      }
      return Ok(validDecimal);
    },
    isValidDecimal(value, fieldName),
  );
};

/**
 * Validates non-empty string
 */
export const isNonEmptyString = (value: unknown, fieldName: string): Result<string> => {
  if (typeof value !== "string") {
    return Err(
      create("INVALID_STRING_TYPE", `${fieldName} must be a string`, "VALIDATION", {
        field: fieldName,
        value,
        type: typeof value,
      }),
    );
  }

  if (value.trim() === "") {
    return Err(
      create("INVALID_STRING_EMPTY", `${fieldName} cannot be empty`, "VALIDATION", {
        field: fieldName,
        value,
      }),
    );
  }

  return Ok(value);
};

/**
 * Validates optional string (can be undefined, but if present must be non-empty)
 */
export const isOptionalNonEmptyString = (
  value: unknown,
  fieldName: string,
): Result<string | undefined> => {
  if (value === undefined) {
    return Ok(undefined);
  }

  return flatMap((validString) => Ok(validString), isNonEmptyString(value, fieldName));
};

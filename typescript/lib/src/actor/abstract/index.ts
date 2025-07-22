// Actor Abstract Classes - DSL Part II Implementation
//
// These abstract classes implement DSL contracts with workflow abstraction,
// delegating concrete implementation to handler methods for technology-specific integration.

export { BaseActor } from "./BaseActor";

// Reader Abstract Classes
export { Reader } from "./Reader";
export { HistoricalReader } from "./HistoricalReader";
export { StreamingReader } from "./StreamingReader";

// Writer Abstract Classes
export { Writer } from "./Writer";
export { HistoricalWriter } from "./HistoricalWriter";
export { StreamingWriter } from "./StreamingWriter";

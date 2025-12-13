/**
 * Test Data Helpers
 * Utilities for generating unique test data to avoid conflicts
 */

/**
 * Generate unique deck name with timestamp
 * Ensures each test run creates decks with unique names to avoid database conflicts
 * Format: baseName + DDHHmmssSSS (no special characters)
 * 
 * @param baseName - Base name for the deck (e.g., "Test")
 * @param maxLength - Maximum length of the returned name (default: 30)
 * @returns Unique deck name with timestamp (e.g., "Test13153045123")
 * 
 * @example
 * ```typescript
 * const deckName = generateUniqueDeckName("MyFirstDeck");
 * // Returns: "MyFirstDeck13153045123" (if within maxLength)
 * 
 * const deckName = generateUniqueDeckName("VeryLongDeckName", 20);
 * // Returns: "Ver13153045123" (baseName truncated to fit)
 * ```
 */
export function generateUniqueDeckName(baseName: string, maxLength: number = 30): string {
  const now = new Date();
  const timestamp = 
    now.getDate().toString().padStart(2, '0') +
    now.getHours().toString().padStart(2, '0') +
    now.getMinutes().toString().padStart(2, '0') +
    now.getSeconds().toString().padStart(2, '0') +
    now.getMilliseconds().toString().padStart(3, '0');
  
  // Timestamp is always 11 characters (DDHHmmssSSS)
  const timestampLength = timestamp.length;
  
  // Calculate max length for base name
  const maxBaseLength = maxLength - timestampLength;
  
  if (maxBaseLength <= 0) {
    throw new Error(
      `maxLength (${maxLength}) must be greater than timestamp length (${timestampLength})`
    );
  }
  
  // Truncate base name if necessary
  const truncatedBase = baseName.slice(0, maxBaseLength);
  
  return `${truncatedBase}${timestamp}`;
}

/**
 * Generate short unique identifier
 * Uses timestamp in milliseconds for a shorter unique suffix
 * 
 * @param baseName - Base name for the deck
 * @param maxLength - Maximum length of the returned name (default: 30)
 * @returns Unique deck name with timestamp in ms (e.g., "Test1702479045123")
 * 
 * @example
 * ```typescript
 * const deckName = generateUniqueDeckNameShort("Test");
 * // Returns: "Test1702479045123"
 * ```
 */
export function generateUniqueDeckNameShort(baseName: string, maxLength: number = 30): string {
  const timestamp = Date.now().toString();
  
  // Calculate max length for base name
  const maxBaseLength = maxLength - timestamp.length;
  
  if (maxBaseLength <= 0) {
    throw new Error(
      `maxLength (${maxLength}) must be greater than timestamp length (${timestamp.length})`
    );
  }
  
  // Truncate base name if necessary
  const truncatedBase = baseName.slice(0, maxBaseLength);
  
  return `${truncatedBase}${timestamp}`;
}

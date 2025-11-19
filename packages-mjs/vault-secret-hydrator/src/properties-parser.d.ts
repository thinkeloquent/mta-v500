/**
 * Type definitions for properties-parser
 */

declare module 'properties-parser' {
  /**
   * Parse properties string into an object
   * @param content - The properties content to parse
   * @returns Parsed properties as key-value object
   */
  export function parse(content: string): Record<string, string | Record<string, string>>;

  /**
   * Read properties from a file
   * @param file - Path to the properties file
   * @param options - Encoding options
   * @param callback - Callback function
   */
  export function read(
    file: string,
    options?: { encoding?: string },
    callback?: (error: Error | null, data: Record<string, string>) => void,
  ): void;

  /**
   * Create properties string from object
   * @param obj - Object to convert to properties format
   * @returns Properties string
   */
  export function createEditor(obj?: Record<string, string>): any;
}

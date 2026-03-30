/**
 * Don't be confused by the name! This is not utils.ts, which is helper functions for
 * client rendering, nor is it api.ts, which is standardized API calls.
 * This is a file to store helper functions for the API endpoints themselves, not
 * accessible by users.
 * 
 * Server-side API utilities for normalizing and validating inputs.
 *
 * Naming conventions enforced by the API:
 *   Property keys      → snake_case lowercase    e.g. publication_date
 *   Relationship types → UPPER_SNAKE_CASE         e.g. EDITION_OF
 *   Node labels        → PascalCase (one word)    e.g. Translator
 *
 *
 * NOTE: Existing nodes in the database may still have camelCase property
 * keys (e.g. "publicationDate") created before this convention was enforced.
 * Those should be migrated separately. The DELETE property endpoint will only
 * be able to remove keys by their exact stored name, so callers targeting
 * legacy camelCase keys must supply the original name rather than the
 * normalised form.
 */

// ---------------------------------------------------------------------------
// Transformation helpers
// ---------------------------------------------------------------------------

/**
 * Convert a string to snake_case lowercase.
 * Handles camelCase, PascalCase, spaces, hyphens, and consecutive capitals.
 *
 * "publicationDate"  → "publication_date"
 * "Publication Date" → "publication_date"
 * "XMLParser"        → "xml_parser"
 * "my-key"           → "my_key"
 */
export function toSnakeCase(str: string): string {
  return str
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')   // XMLParser  → XML_Parser
    .replace(/([a-z\d])([A-Z])/g, '$1_$2')         // camelCase  → camel_Case
    .replace(/[\s\-]+/g, '_')                        // spaces/hyphens → underscores
    .replace(/_+/g, '_')                             // collapse consecutive underscores
    .replace(/^_|_$/g, '')                           // trim leading/trailing underscores
    .toLowerCase();
}

/**
 * Convert a string to UPPER_SNAKE_CASE.
 * Used for relationship types.
 *
 * "editionOf"  → "EDITION_OF"
 * "edition of" → "EDITION_OF"
 * "edition_of" → "EDITION_OF"
 */
export function toUpperSnakeCase(str: string): string {
  return toSnakeCase(str).toUpperCase();
}

/**
 * Convert a string to PascalCase (first letter of each word capitalised,
 * words joined without a separator). Labels should ideally be a single word;
 * multi-word inputs are joined so the result remains one token.
 *
 * "translator"   → "Translator"
 * "AUTHOR"       → "Author"
 * "book_edition" → "BookEdition"
 * "my label"     → "MyLabel"
 */
export function toPascalCase(str: string): string {
  if (!str) return str;
  return str
    .split(/[\s_\-]+/)
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('');
}

/**
 * Normalise all keys in a properties object to snake_case.
 * Values are left unchanged.
 *
 * { "publicationDate": "1970", "MyKey": 42 }
 * → { "publication_date": "1970", "my_key": 42 }
 *
 * If two input keys normalise to the same snake_case key the last one wins
 * (consistent with Object.entries ordering).
 */
export function normalizePropertyKeys(props: Record<string, any>): Record<string, any> {
  const normalized: Record<string, any> = {};
  for (const [key, value] of Object.entries(props)) {
    normalized[toSnakeCase(key)] = value;
  }
  return normalized;
}

// ---------------------------------------------------------------------------
// Validation regexes (applied AFTER normalization)
// ---------------------------------------------------------------------------

/** snake_case key starting with a letter: publication_date, title, etc. */
export const VALID_PROPERTY_KEY = /^[a-z][a-z0-9_]*$/;

/** PascalCase label, no underscores, starting with a capital: Author, BookEdition */
export const VALID_LABEL = /^[A-Z][a-zA-Z0-9]*$/;

/** UPPER_SNAKE_CASE relationship type: EDITION_OF, WROTE */
export const VALID_REL_TYPE = /^[A-Z][A-Z0-9_]*$/;
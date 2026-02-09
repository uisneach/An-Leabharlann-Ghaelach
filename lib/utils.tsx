import { Node, Relationship } from '@/lib/types';

/**
 * Centralized utility functions
 * All common utilities should be placed here
 */

// ============================================
// STRING UTILITIES
// ============================================

/**
 * Clean string by replacing underscores with spaces and capitalizing words
 */
export function cleanString(str: string): string {
  return str.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());
}

/**
 * Escape HTML special characters
 */
export function escapeHtml(str: string): string {
  const escapeMap: { [key: string]: string } = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return str.replace(/[&<>"']/g, (match) => escapeMap[match]);
}

export function getNodeDisplayName(node: Node): string {
  return node.properties.display_name || 
         node.properties.name || 
         node.properties.title || 
         node.nodeId;
}

// ============================================
// URL UTILITIES
// ============================================

/**
 * Check if a string is a valid URL
 */
export function isUrl(str: string): boolean {
  try {
    new URL(str);
    return true;
  } catch {
    return false;
  }
}

// ============================================
// JWT UTILITIES
// ============================================

export interface JwtPayload {
  username?: string;
  sub?: string;
  exp?: number;
  role?: string;
}

/**
 * Parse a JWT token to extract payload
 */
export function parseJwt(token: string): JwtPayload {
  try {
    const part = token.split('.')[1];
    return JSON.parse(atob(part));
  } catch (e) {
    return {};
  }
}

/**
 * Check if JWT token is expired
 */
export function isTokenExpired(token: string): boolean {
  try {
    const payload = parseJwt(token);
    if (payload && payload.exp) {
      return Date.now() >= payload.exp * 1000;
    }
    return false;
  } catch (e) {
    return true;
  }
}

// ============================================
// VALIDATION UTILITIES
// ============================================

/**
 * Validate username format
 */
export function validateUsername(username: string): { valid: boolean; error?: string } {
  if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
    return {
      valid: false,
      error: 'Username must be 3-20 characters, alphanumeric and underscores only.'
    };
  }
  return { valid: true };
}

/**
 * Validate password strength
 */
export function validatePassword(password: string): { valid: boolean; error?: string } {
  if (password.length < 8) {
    return {
      valid: false,
      error: 'Password must be at least 8 characters long.'
    };
  }
  return { valid: true };
}

/**
 * Validate label format (for Neo4j)
 */
export function validateLabel(label: string): { valid: boolean; error?: string } {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(label)) {
    return {
      valid: false,
      error: 'Labels must start with a letter or underscore, followed by letters, numbers, or underscores.'
    };
  }
  return { valid: true };
}

/**
 * Validate property key format (for Neo4j)
 */
export function validatePropertyKey(key: string): { valid: boolean; error?: string } {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(key)) {
    return {
      valid: false,
      error: 'Property keys must start with a letter or underscore, followed by letters, numbers, or underscores.'
    };
  }
  if (['nodeId', 'createdBy'].includes(key)) {
    return {
      valid: false,
      error: `Property key '${key}' is reserved and cannot be used.`
    };
  }
  return { valid: true };
}

// ============================================
// NODE UTILITIES
// ============================================

/**
 * Get trimmed and lowercased title for sorting
 */
export function getNodeSortKey(node: { 
  properties: { 
    display_name?: string; 
    name?: string; 
    title?: string; 
    nodeId?: string | number; 
  }
}): string {
  const title = node.properties.display_name || 
                node.properties.name || 
                node.properties.title || 
                node.properties.nodeId || 
                '';
  return String(title).trim().toLowerCase();
}

/**
 * Sort nodes alphabetically by display name
 */
export function sortNodes<T extends { 
  properties: { 
    display_name?: string; 
    name?: string; 
    title?: string; 
    nodeId?: string | number; 
  }
}>(nodes: T[]): T[] {
  return [...nodes].sort((a, b) => 
    getNodeSortKey(a).localeCompare(getNodeSortKey(b), undefined, { 
      sensitivity: 'base', 
      numeric: false 
    })
  );
}

// ============================================
// ARRAY UTILITIES
// ============================================

/**
 * Remove duplicates from array
 */
export function unique<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}

/**
 * Group array items by key function
 */
export function groupBy<T>(arr: T[], keyFn: (item: T) => string): Record<string, T[]> {
  return arr.reduce((groups, item) => {
    const key = keyFn(item);
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(item);
    return groups;
  }, {} as Record<string, T[]>);
}

// ============================================
// RELATIONSHIP UTILITIES
// ============================================

/**
 * Category mappings for relationships
 */
export const RELATIONSHIP_CATEGORIES = {
  incoming: {
    'EDITION_OF': 'Editions',
    'VERSION_OF': 'Versions',
    'DERIVED_FROM': 'Main Text',
    'TRANSLATION_OF': 'Translations',
    'TRANSLATED': 'Translators',
    'PUBLISHED': 'Publisher',
    'PUBLISHES': 'Publisher',
    'WROTE': 'Author',
    'DISPLAYS': 'Displayed On',
    'PUBLISHED_IN': 'Published',
    'HOSTS': 'Hosted By',
    'COMMENTARY_ON': 'Commentary',
    'NEXT_IN_SERIES': 'Previous in Series',
    'ISSUE_OF': 'Issues',
    'EDITED': 'Editor'
  },
  outgoing: {
    'PUBLISHED_BY': 'Publishers',
    'PUBLISHED': 'Published',
    'PUBLISHES': 'Publishes',
    'EDITION_OF': 'Source Text',
    'VERSION_OF': 'A Version Of',
    'DERIVED_FROM': 'Derived From',
    'WROTE': 'Works',
    'PUBLISHED_IN': 'Published In',
    'TRANSLATED': 'Translated',
    'DISPLAYS': 'Displays',
    'HOSTS': 'Hosts',
    'COMMENTARY_ON': 'Commentary On',
    'NEXT_IN_SERIES': 'Next in Series',
    'ISSUE_OF': 'Parent Journal',
    'EDITED': 'Editions'
  }
} as const;

/**
 * Categorize relationships into named groups
 */
export function categorizeRelationships(
  incoming: Relationship[], 
  outgoing: Relationship[]
): {
  categorized: Record<string, (Relationship & { direction: 'incoming' | 'outgoing' })[]>;
  uncategorized: { incoming: Relationship[], outgoing: Relationship[] };
} {
  const categorized: Record<string, (Relationship & { direction: 'incoming' | 'outgoing' })[]> = {};
  const uncategorized: { incoming: Relationship[], outgoing: Relationship[] } = { 
    incoming: [], 
    outgoing: [] 
  };

  incoming.forEach(rel => {
    const header = RELATIONSHIP_CATEGORIES.incoming[rel.type as keyof typeof RELATIONSHIP_CATEGORIES.incoming];
    if (header) {
      if (!categorized[header]) categorized[header] = [];
      categorized[header].push({ ...rel, direction: 'incoming' });
    } else {
      uncategorized.incoming.push(rel);
    }
  });

  outgoing.forEach(rel => {
    const header = RELATIONSHIP_CATEGORIES.outgoing[rel.type as keyof typeof RELATIONSHIP_CATEGORIES.outgoing];
    if (header) {
      if (!categorized[header]) categorized[header] = [];
      categorized[header].push({ ...rel, direction: 'outgoing' });
    } else {
      uncategorized.outgoing.push(rel);
    }
  });

  return { categorized, uncategorized };
}

// Helper to compare two relationships for equality (unique by from, to, type)
export const isSameRel = (a: Relationship, b: Relationship): boolean => {
  return (
    a.fromNode.nodeId === b.fromNode.nodeId &&
    a.toNode.nodeId === b.toNode.nodeId &&
    a.type === b.type
  );
};

// ============================================
// LOCAL STORAGE UTILITIES
// ============================================

/**
 * Safely get item from localStorage (handles SSR)
 */
export function getLocalStorage(key: string): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(key);
}

/**
 * Safely set item in localStorage (handles SSR)
 */
export function setLocalStorage(key: string, value: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key, value);
}

/**
 * Safely remove item from localStorage (handles SSR)
 */
export function removeLocalStorage(key: string): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(key);
}

/**
 * Clear all auth tokens from localStorage
 */
export function clearAuthTokens(): void {
  removeLocalStorage('token');
  removeLocalStorage('refreshToken');
}

// ============================================
// EVENT UTILITIES
// ============================================

/**
 * Handle keyboard Enter key press
 */
export function handleEnterKey(
  e: React.KeyboardEvent, 
  action: () => void
): void {
  if (e.key === 'Enter') {
    e.preventDefault();
    action();
  }
}

// ============================================
// PROPERTY RENDERING UTILITIES
// ============================================

/**
 * Render property value (handles arrays and URLs)
 */
export function renderPropertyValue(value: any): React.ReactNode {
  if (Array.isArray(value)) {
    return value.map((item: any, idx: number) => (
      <div key={idx}>
        {isUrl(String(item)) ? (
          <a href={String(item)} target="_blank" rel="noopener noreferrer">
            {String(item)}
          </a>
        ) : (
          <span>{String(item)}</span>
        )}
      </div>
    ));
  }
  
  if (typeof value === 'string' && isUrl(value)) {
    return (
      <a href={value} target="_blank" rel="noopener noreferrer">
        {value}
      </a>
    );
  }
  
  return String(value);
}

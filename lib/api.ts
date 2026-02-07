/**
 * Centralized API utilities
 * All API calls should use these functions to ensure consistency
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '/api';

// ============================================
// HELPERS
// ============================================

/**
 * Get authorization headers with token if available
 */
export function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }
  
  return headers;
}

// ============================================
// AUTH API
// ============================================

export async function login(username: string, password: string) {
  return fetch(`${API_BASE_URL}/auth?action=login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
}

export async function register(username: string, password: string) {
  return fetch(`${API_BASE_URL}/auth?action=register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
}

export async function refreshToken(refreshToken: string) {
  return fetch(`${API_BASE_URL}/auth?action=refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken })
  });
}

// ============================================
// NODE API
// ============================================

export async function getNode(nodeId: string) {
  return fetch(`${API_BASE_URL}/nodes/${nodeId}`, {
    headers: getAuthHeaders()
  });
}

export async function getNodesByLabel(label: string, limit?: number) {
  const params = new URLSearchParams();
  params.append('action', 'nodes');
  params.append('label', label);
  if (limit !== undefined) {
    params.append('limit', limit.toString());
  }
  
  return fetch(`${API_BASE_URL}/util?${params.toString()}`, {
    headers: getAuthHeaders()
  });
}

export async function createNode(labels: string[], properties: Record<string, any>) {
  return fetch(`${API_BASE_URL}/nodes/create`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ 
      label: labels[0], // API currently uses single label
      properties 
    })
  });
}

export async function updateNode(nodeId: string, data: { labels?: string[], properties?: Record<string, any> }) {
  return fetch(`${API_BASE_URL}/nodes/${nodeId}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(data)
  });
}

export async function deleteNode(nodeId: string) {
  return fetch(`${API_BASE_URL}/nodes/${nodeId}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });
}

// ============================================
// PROPERTY API
// ============================================

export async function getNodeProperties(nodeId: string) {
  return fetch(`${API_BASE_URL}/nodes/${nodeId}/properties`, {
    headers: getAuthHeaders()
  });
}

export async function addNodeProperties(nodeId: string, properties: Record<string, any>) {
  return fetch(`${API_BASE_URL}/nodes/${nodeId}/properties`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ properties })
  });
}

export async function updateNodeProperties(nodeId: string, properties: Record<string, any>) {
  return fetch(`${API_BASE_URL}/nodes/${nodeId}/properties`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify({ properties })
  });
}

export async function deleteNodeProperties(nodeId: string, keys: string[]) {
  return fetch(`${API_BASE_URL}/nodes/${nodeId}/properties`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
    body: JSON.stringify({ keys })
  });
}

export async function deleteNodeProperty(nodeId: string, key: string) {
  return fetch(`${API_BASE_URL}/nodes/${nodeId}/properties/${key}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });
}

// ============================================
// LABEL API
// ============================================

export async function addNodeLabels(nodeId: string, labels: string[]) {
  return fetch(`${API_BASE_URL}/nodes/${nodeId}/labels`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ labels })
  });
}

export async function deleteNodeLabels(nodeId: string, labels: string[]) {
  return fetch(`${API_BASE_URL}/nodes/${nodeId}/labels`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
    body: JSON.stringify({ labels })
  });
}

// ============================================
// RELATIONSHIP API
// ============================================

export async function getNodeRelationships(nodeId: string) {
  return fetch(`${API_BASE_URL}/nodes/${nodeId}/relationships?nodeId=${encodeURIComponent(nodeId)}`, {
    headers: getAuthHeaders()
  });
}

export async function getRelationship(fromNodeId: string, toNodeId: string, type: string) {
  const params = new URLSearchParams({ fromNodeId, toNodeId, type });
  return fetch(`${API_BASE_URL}/relationships?${params.toString()}`, {
    headers: getAuthHeaders()
  });
}

export async function createRelationship(fromNodeId: string, toNodeId: string, type: string) {
  console.log(fromNodeId);
  return fetch(`${API_BASE_URL}/relationships`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ fromNodeId, toNodeId, type })
  });
}

export async function deleteRelationship(fromNodeId: string, toNodeId: string, type: string) {
  const params = new URLSearchParams({ fromNodeId, toNodeId, type });
  return fetch(`${API_BASE_URL}/relationships?${params.toString()}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });
}

// ============================================
// SEARCH API
// ============================================

export interface SearchOptions {
  query: string;
  labels?: string[];
  excludeLabels?: string[];
  properties?: Record<string, any>;
  limit?: number;
}

/**
 * Search for nodes with intelligent ranking
 * 
 * @param options - Search options object or legacy string query
 * @param legacyLabel - Optional label filter (for backward compatibility)
 * 
 * @example
 * // Simple search
 * searchNodes('homer')
 * 
 * @example
 * // Search with label filter
 * searchNodes('iliad', 'Text')
 * 
 * @example
 * // Advanced search with all options
 * searchNodes({
 *   query: 'celtic',
 *   labels: ['Text', 'Author'],
 *   excludeLabels: ['Translation'],
 *   properties: { language: 'Irish' },
 *   limit: 20
 * })
 */
export async function searchNodes(options: SearchOptions | string, legacyLabel?: string) {
  // Support legacy single-string query format for backward compatibility
  if (typeof options === 'string') {
    const params = new URLSearchParams({ q: options });
    if (legacyLabel) {
      params.append('label', legacyLabel);
    }
    return fetch(`${API_BASE_URL}/search?${params.toString()}`, {
      headers: getAuthHeaders()
    });
  }
  
  // New format with full options
  const params = new URLSearchParams({ q: options.query });
  
  if (options.labels && options.labels.length > 0) {
    params.append('label', options.labels.join(','));
  }
  
  if (options.excludeLabels && options.excludeLabels.length > 0) {
    params.append('excludeLabel', options.excludeLabels.join(','));
  }
  
  if (options.properties) {
    const propertyPairs = Object.entries(options.properties)
      .map(([key, value]) => `${key}:${value}`)
      .join(',');
    params.append('property', propertyPairs);
  }
  
  if (options.limit) {
    params.append('limit', options.limit.toString());
  }
  
  return fetch(`${API_BASE_URL}/search?${params.toString()}`, {
    headers: getAuthHeaders()
  });
}

// ============================================
// UTILITY API
// ============================================

export async function getAllLabels() {
  return fetch(`${API_BASE_URL}/util?action=labels`, {
    headers: getAuthHeaders()
  });
}

export async function healthCheck() {
  return fetch(`${API_BASE_URL}/util?action=health`);
}

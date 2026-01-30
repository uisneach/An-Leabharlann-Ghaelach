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

export async function searchNodes(query: string, label?: string) {
  const params = new URLSearchParams({ 
    action: 'search',
    q: query 
  });
  if (label) {
    params.append('label', label);
  }
  
  return fetch(`${API_BASE_URL}/util?${params.toString()}`, {
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

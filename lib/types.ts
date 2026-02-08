export interface Node {
  nodeId: string;
  labels: string[];
  properties: {
    display_name?: string;
    title?: string;
    name?: string;
    [key: string]: any;
  };
}

export interface Relationship {
  type: string;
  fromNode: Node;
  toNode: Node;
}

export interface NodeData extends Node {
  outgoing: Relationship[];
  incoming: Relationship[];
}

export interface CreateNodeRequest {
  label: string;
  properties: Record<string, any>;
}

export interface UpdateNodeRequest {
  label: string;
  id: string;
  properties: Record<string, any>;
}

export interface DeleteNodeRequest {
  label: string;
  id: string;
}

export interface CreateRelationshipRequest {
  fromLabel: string;
  fromId: string;
  toLabel: string;
  toId: string;
  relationshipType: string;
  properties?: Record<string, any>;
}

export interface UpdateRelationshipRequest {
  fromLabel: string;
  fromId: string;
  toLabel: string;
  toId: string;
  relationshipType: string;
  properties: Record<string, any>;
}

export interface DeleteRelationshipRequest {
  fromLabel: string;
  fromId: string;
  toLabel: string;
  toId: string;
  relationshipType: string;
}

export interface SearchResult {
  nodeId: string;
  labels: string[];
  properties: {
    display_name?: string;
    name?: string;
    title?: string;
    [key: string]: any;
  };
  score: number;
  matchedProperty?: string;
  matchType?: 'exact' | 'prefix' | 'substring';
}

export interface SearchResponse {
  success: boolean;
  query: string;
  results: SearchResult[];
  totalMatches: number;
}
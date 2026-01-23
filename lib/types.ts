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

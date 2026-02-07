import React, { useState } from 'react';
import { cleanString, escapeHtml } from '@/lib/utils';
import { searchNodes, createRelationship } from '@/lib/api';

interface Node {
  nodeId: string;
  properties: {
    display_name?: string;
    name?: string;
    title?: string;
    [key: string]: any;
  };
}

interface Relationship {
  type: string;
  fromNode: Node;
  toNode: Node;
}

interface SearchResult {
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

interface SearchResponse {
  success: boolean;
  query: string;
  results: SearchResult[];
  totalMatches: number;
}

interface RelationshipsManagerProps {
  nodeId: string;
  nodeTitle: string;
  incoming: Relationship[];
  outgoing: Relationship[];
  onDeleteRelationship: (sourceId: string, targetId: string, relType: string) => void;
  onRelationshipCreated?: () => void;
}

/**
 * Component for managing node relationships and creating new ones
 */
const RelationshipsManager: React.FC<RelationshipsManagerProps> = ({
  nodeId,
  nodeTitle,
  incoming,
  outgoing,
  onDeleteRelationship,
  onRelationshipCreated
}) => {
  // State for creating new relationships
  const [relType, setRelType] = useState<string>('');
  const [relDirection, setRelDirection] = useState<'outgoing' | 'incoming'>('outgoing');
  const [relSearchQuery, setRelSearchQuery] = useState<string>('');
  const [relSearchResults, setRelSearchResults] = useState<SearchResult[]>([]);
  const [relSearching, setRelSearching] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [creating, setCreating] = useState<boolean>(false);

  // Group relationships by type
  const allRelTypes = new Map<string, { incoming: Relationship[], outgoing: Relationship[] }>();

  incoming.forEach(rel => {
    if (!allRelTypes.has(rel.type)) {
      allRelTypes.set(rel.type, { incoming: [], outgoing: [] });
    }
    allRelTypes.get(rel.type)!.incoming.push(rel);
  });
  
  outgoing.forEach(rel => {
    if (!allRelTypes.has(rel.type)) {
      allRelTypes.set(rel.type, { incoming: [], outgoing: [] });
    }
    allRelTypes.get(rel.type)!.outgoing.push(rel);
  });

  const getNodeLabel = (node: Node): string => {
    return node.properties.display_name || 
           node.properties.name || 
           node.properties.title || 
           node.nodeId;
  };

  const getDisplayName = (node: SearchResult): string => {
    return node.properties.display_name || 
           node.properties.name || 
           node.properties.title || 
           node.nodeId;
  };

  const handleSearchRelTarget = async () => {
    if (relSearchQuery.trim().length < 2) {
      setError('Please enter at least 2 characters to search');
      return;
    }
    
    setRelSearching(true);
    setError('');
    
    try {
      const response = await searchNodes(relSearchQuery);
      if (!response.ok) throw new Error('Search failed');
      
      const data: SearchResponse = await response.json();
      setRelSearchResults(data.results || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
    } finally {
      setRelSearching(false);
    }
  };

  const handleCreateRelationship = async (targetNode: SearchResult) => {
    if (!relType.trim()) {
      setError('Please enter a relationship type');
      return;
    }
    
    // Validate relationship type format
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(relType.trim())) {
      setError('Relationship type must start with a letter or underscore, followed by letters, numbers, or underscores');
      return;
    }
    
    setCreating(true);
    setError('');
    setSuccess('');
    
    try {
      const fromId = relDirection === 'outgoing' ? nodeId : targetNode.nodeId;
      const toId = relDirection === 'outgoing' ? targetNode.nodeId : nodeId;

      console.log(nodeId);
      console.log(targetNode);
      
      const response = await createRelationship(fromId, toId, relType.trim());
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data?.error || 'Failed to create relationship');
      }
      
      const targetLabel = getDisplayName(targetNode);
      
      setSuccess(`Successfully created ${relType} relationship with ${targetLabel}`);
      
      // Reset form
      setRelType('');
      setRelSearchQuery('');
      setRelSearchResults([]);
      
      // Notify parent component to reload data
      if (onRelationshipCreated) {
        onRelationshipCreated();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create relationship');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="mt-5" id="relationships-container">
      <h3 className="h4 border-bottom pb-2 mb-3">Manage Relationships</h3>
      
      {/* Existing Relationships */}
      {Array.from(allRelTypes.entries()).map(([relType, { incoming: inRels, outgoing: outRels }]) => (
        <div key={relType} className="rels-section mb-4">
          <h4 className="h5">{cleanString(relType)}</h4>
          
          {inRels.length > 0 && (
            <div className="mb-3">
              <h5 className="h6 text-muted">Incoming</h5>
              <ul className="rels-list list-unstyled">
                {inRels.map((rel, idx) => {
                  const fromNode = rel.fromNode;
                  const fromLabel = getNodeLabel(fromNode);
                  
                  return (
                    <li key={idx} className="mb-2">
                      <a href={`/info?id=${encodeURIComponent(fromNode.nodeId || fromNode.id)}`}>
                        {fromLabel}
                      </a>
                      {' '}==[{relType}]==&gt;{' '}
                      <a href={`/info?id=${encodeURIComponent(nodeId)}`}>
                        {nodeTitle}
                      </a>
                      <button 
                        className="btn btn-sm btn-danger ms-2"
                        onClick={() => onDeleteRelationship(fromNode.id, nodeId, relType)}
                      >
                        Delete
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
          
          {outRels.length > 0 && (
            <div className="mb-3">
              <h5 className="h6 text-muted">Outgoing</h5>
              <ul className="rels-list list-unstyled">
                {outRels.map((rel, idx) => {
                  const toNode = rel.toNode;
                  const toLabel = getNodeLabel(toNode);
                  
                  return (
                    <li key={idx} className="mb-2">
                      <a href={`/info?id=${encodeURIComponent(nodeId)}`}>
                        ({nodeTitle})
                      </a>
                      {' '}==[{relType}]==&gt;{' '}
                      <a href={`/info?id=${encodeURIComponent(toNode.nodeId || toNode.id)}`}>
                        ({toLabel})
                      </a>
                      <button 
                        className="btn btn-sm btn-danger ms-2"
                        onClick={() => onDeleteRelationship(nodeId, toNode.id, relType)}
                      >
                        Delete
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      ))}

      {/* Create New Relationship Section */}
      <div className="mt-5">
        <h3 className="h4 border-bottom pb-2 mb-3">Create New Relationship</h3>
        
        <div className="create-rel-form-card">
          <div className="create-rel-form-body">
            
            {error && (
              <div className="create-alert create-alert-danger">
                {error}
                <button type="button" className="create-alert-close" onClick={() => setError('')}>×</button>
              </div>
            )}
            
            {success && (
              <div className="alert alert-success">
                {success}
                <button type="button" className="create-alert-close" onClick={() => setSuccess('')}>×</button>
              </div>
            )}
            
            <div className="create-rel-row">
              <div className="create-rel-col">
                <label className="create-rel-label">Relationship Type</label>
                <input
                  type="text"
                  className="create-rel-input"
                  placeholder="e.g., WROTE, EDITION_OF"
                  value={relType}
                  onChange={(e) => setRelType(e.target.value)}
                />
                <small className="text-muted">
                  Use UPPERCASE with underscores (e.g., EDITION_OF, WROTE)
                </small>
              </div>
              <div className="create-rel-col">
                <label className="create-rel-label">Direction</label>
                <select 
                  className="create-rel-select"
                  value={relDirection}
                  onChange={(e) => setRelDirection(e.target.value as 'outgoing' | 'incoming')}>
                  <option value="outgoing">Outgoing ({nodeTitle} → Target)</option>
                  <option value="incoming">Incoming (Target → {nodeTitle})</option>
                </select>
              </div>
            </div>
            
            <div>
              <label className="create-rel-label">Search for Target Node</label>
              <div className="create-search-group">
                <input
                  type="text"
                  placeholder="Search for a node..."
                  value={relSearchQuery}
                  onChange={(e) => setRelSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearchRelTarget()}
                />
                <button 
                  className="create-search-button" 
                  onClick={handleSearchRelTarget}
                  disabled={relSearching}
                >
                  {relSearching ? 'Searching...' : 'Search'}
                </button>
              </div>
            </div>
            
            {relSearchResults.length > 0 && (
              <div style={{ marginTop: '1rem' }}>
                <label className="create-rel-label">Search Results - Click to Create Relationship</label>
                <div className="create-search-results">
                  {relSearchResults.map((node) => {
                    const displayLabel = getDisplayName(node);
                    const nodeLabels = (node.labels || []).filter(l => l !== 'Entity').join(', ');
                    
                    return (
                      <button
                        key={node.nodeId}
                        className="create-search-result-item"
                        onClick={() => handleCreateRelationship(node)}
                        disabled={creating}>
                        <div className="create-search-result-header">
                          <div>
                            <div className="create-search-result-title">{displayLabel}</div>
                            <div className="create-search-result-labels">{nodeLabels}</div>
                            {node.matchedProperty && (
                              <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                                Matched in: {node.matchedProperty}
                                {node.matchType && ` (${node.matchType})`}
                              </div>
                            )}
                          </div>
                          {creating && (
                            <span className="create-spinner" role="status" aria-hidden="true"></span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RelationshipsManager;

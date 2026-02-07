import React, { useState } from 'react';
import { searchNodes, createRelationship, SearchOptions } from '@/lib/api';
import { escapeHtml } from '@/lib/utils';

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

interface RelationshipCreatorProps {
  currentNodeId: string;
  currentNodeTitle: string;
  onRelationshipCreated?: () => void;
}

/**
 * Shared component for creating relationships between nodes
 * Used on both Create and Edit pages
 */
const RelationshipCreator: React.FC<RelationshipCreatorProps> = ({
  currentNodeId,
  currentNodeTitle,
  onRelationshipCreated
}) => {
  const [relType, setRelType] = useState<string>('');
  const [relDirection, setRelDirection] = useState<'outgoing' | 'incoming'>('outgoing');
  const [relSearchQuery, setRelSearchQuery] = useState<string>('');
  const [relSearchResults, setRelSearchResults] = useState<SearchResult[]>([]);
  const [relSearching, setRelSearching] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [creating, setCreating] = useState<boolean>(false);

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
      const fromId = relDirection === 'outgoing' ? currentNodeId : targetNode.nodeId;
      const toId = relDirection === 'outgoing' ? targetNode.nodeId : currentNodeId;
      
      const response = await createRelationship(fromId, toId, relType.trim());
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data?.error || 'Failed to create relationship');
      }
      
      const targetLabel = targetNode.properties.display_name 
        || targetNode.properties.name 
        || targetNode.properties.title 
        || targetNode.nodeId;
      
      setSuccess(`Successfully created ${relType} relationship with ${targetLabel}`);
      
      // Reset form
      setRelType('');
      setRelSearchQuery('');
      setRelSearchResults([]);
      
      // Notify parent component
      if (onRelationshipCreated) {
        onRelationshipCreated();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create relationship');
    } finally {
      setCreating(false);
    }
  };

  const getDisplayName = (node: SearchResult): string => {
    return node.properties.display_name || 
           node.properties.name || 
           node.properties.title || 
           node.nodeId;
  };

  return (
    <div className="create-rel-form-card">
      <div className="create-rel-form-body">
        <h4 className="create-section-title">Create New Relationship</h4>
        
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
              placeholder="e.g., WROTE, PUBLISHED_BY, EDITION_OF"
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
              onChange={(e) => setRelDirection(e.target.value as 'outgoing' | 'incoming')}
            >
              <option value="outgoing">Outgoing ({currentNodeTitle} → Target)</option>
              <option value="incoming">Incoming (Target → {currentNodeTitle})</option>
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
                    disabled={creating}
                  >
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
  );
};

export default RelationshipCreator;

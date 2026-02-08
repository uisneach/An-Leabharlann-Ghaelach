import React, { useState } from 'react';
import { searchNodes, SearchOptions } from '@/lib/api';
import { getNodeDisplayName } from '@/lib/utils';
import { SearchResult, SearchResponse, Relationship, Node } from '@/lib/types';

interface RelationshipCreatorProps {
  currentNodeId: string;
  currentNodeTitle: string;
  onStageRelationship: (relationship: Relationship) => void;
}

/**
 * Shared component for staging relationships between nodes
 * Used on both Create and Edit pages
 */
const RelationshipCreator: React.FC<RelationshipCreatorProps> = ({
  currentNodeId,
  currentNodeTitle,
  onCreateRelationship
}) => {
  const [relType, setRelType] = useState<string>('');
  const [relDirection, setRelDirection] = useState<'outgoing' | 'incoming'>('outgoing');
  const [relSearchQuery, setRelSearchQuery] = useState<string>('');
  const [relSearchResults, setRelSearchResults] = useState<SearchResult[]>([]);
  const [relSearching, setRelSearching] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

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

  const handleStageRelationship = (targetNode: SearchResult) => {
    if (!relType.trim()) {
      setError('Please enter a relationship type');
      return;
    }
    
    // Validate relationship type format
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(relType.trim())) {
      setError('Relationship type must start with a letter or underscore, followed by letters, numbers, or underscores');
      return;
    }
    
    // Convert SearchResult to Node format
    const targetNodeData: Node = {
      nodeId: targetNode.nodeId,
      properties: targetNode.properties,
      labels: targetNode.labels
    };
    
    // Create relationship based on direction
    const createdRel: Relationship = relDirection === 'outgoing' 
      ? {
          type: relType.trim(),
          fromNode: {
            nodeId: currentNodeId,
            properties: { name: currentNodeTitle },
            labels: []
          },
          toNode: targetNodeData
        }
      : {
          type: relType.trim(),
          fromNode: targetNodeData,
          toNode: {
            nodeId: currentNodeId,
            properties: { name: currentNodeTitle },
            labels: []
          }
        };
    
    // Pass the staged relationship to parent
    onCreateRelationship(createdRel);
    
    // Reset form
    setRelType('');
    setRelSearchQuery('');
    setRelSearchResults([]);
    setError('');
  };

  return (
    <div className="create-rel-form-card">
      <div className="create-rel-form-body">
        <h3 className="create-section-title">Create Relationship</h3>
        
        {error && (
          <div className="create-alert create-alert-danger">
            {error}
            <button type="button" className="create-alert-close" onClick={() => setError('')}>×</button>
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
                const displayLabel = getNodeDisplayName(node);
                const nodeLabels = (node.labels || []).filter(l => l !== 'Entity').join(', ');
                
                return (
                  <button
                    key={node.nodeId}
                    className="create-search-result-item"
                    onClick={() => handleStageRelationship(node)}
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
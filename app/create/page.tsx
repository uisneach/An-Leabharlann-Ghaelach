'use client'

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/AuthContext';
import Header from '@/app/Header';
import Footer from '@/app/Footer';
import { createNode, createRelationship, searchNodes, SearchOptions } from '@/lib/api';
import { validateLabel, validatePropertyKey, escapeHtml } from '@/lib/utils';
import { SearchResult, SearchResponse } from '@/lib/types';

// Properties that should use textarea instead of input
const LONG_TEXT_PROPERTIES = ['description', 'contents', 'summary', 'biography', 'analysis'];

interface Property {
  key: string;
  value: string | string[];
  isArray: boolean;
}

interface StagedRelationship {
  id: string;
  type: string;
  direction: 'outgoing' | 'incoming';
  targetNodeId: string;
  targetNodeLabel: string;
}

const CreateNodePage = () => {
  const router = useRouter();
  const { isAuthenticated, username, checkAuthStatus } = useAuth();
  
  const [labels, setLabels] = useState<string[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [relationships, setRelationships] = useState<StagedRelationship[]>([]);
  
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'labels' | 'properties' | 'relationships'>('labels');
  const [authChecked, setAuthChecked] = useState<boolean>(false);
  
  const [newLabel, setNewLabel] = useState<string>('');
  const [newPropertyKey, setNewPropertyKey] = useState<string>('');
  
  const [relType, setRelType] = useState<string>('');
  const [relDirection, setRelDirection] = useState<'outgoing' | 'incoming'>('outgoing');
  const [relSearchQuery, setRelSearchQuery] = useState<string>('');
  const [relSearchResults, setRelSearchResults] = useState<SearchResult[]>([]);
  const [relSearching, setRelSearching] = useState<boolean>(false);

  // NEW: Duplicate detection state
  const [showDuplicateCheck, setShowDuplicateCheck] = useState<boolean>(false);
  const [duplicateCheckQuery, setDuplicateCheckQuery] = useState<string>('');
  const [duplicateResults, setDuplicateResults] = useState<SearchResult[]>([]);
  const [duplicateSearching, setDuplicateSearching] = useState<boolean>(false);
  const [duplicateError, setDuplicateError] = useState<string>('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setAuthChecked(true);
      if (!isAuthenticated) {
        router.push('/');
      }
    }, 100);
    
    return () => clearTimeout(timer);
  }, [isAuthenticated, router]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const label = params.get('label');
      if (label) {
        setLabels([label]);
      }
    }
  }, []);

  const handleAddLabel = () => {
    const trimmed = newLabel.trim();
    if (!trimmed) return;
    
    const validation = validateLabel(trimmed);
    if (!validation.valid) {
      setError(validation.error || 'Invalid label');
      return;
    }
    
    if (labels.includes(trimmed)) {
      setError('Label already added');
      return;
    }
    
    setLabels([...labels, trimmed]);
    setNewLabel('');
    setError('');
  };

  const handleRemoveLabel = (index: number) => {
    setLabels(labels.filter((_, i) => i !== index));
  };

  const handleAddProperty = () => {
    const trimmed = newPropertyKey.trim();
    if (!trimmed) return;
    
    const validation = validatePropertyKey(trimmed);
    if (!validation.valid) {
      setError(validation.error || 'Invalid property key');
      return;
    }
    
    if (properties.some(p => p.key === trimmed)) {
      setError('Property key already exists');
      return;
    }
    
    setProperties([...properties, { key: trimmed, value: '', isArray: false }]);
    setNewPropertyKey('');
    setError('');
  };

  const handleRemoveProperty = (index: number) => {
    setProperties(properties.filter((_, i) => i !== index));
  };

  const handlePropertyKeyChange = (index: number, newKey: string) => {
    const validation = validatePropertyKey(newKey);
    if (!validation.valid) {
      setError(validation.error || 'Invalid property key');
      return;
    }
    
    const updated = [...properties];
    updated[index].key = newKey;
    setProperties(updated);
    setError('');
  };

  // MODIFIED: Auto-trigger duplicate check when name/title is entered
  const handlePropertyValueChange = (index: number, newValue: string | string[]) => {
    const updated = [...properties];
    updated[index].value = newValue;
    setProperties(updated);

    // NEW: Auto-trigger duplicate check for name/title properties
    const propertyKey = properties[index].key.toLowerCase();
    const isNameProperty = ['name', 'title', 'display_name'].includes(propertyKey);
    
    if (isNameProperty && typeof newValue === 'string' && newValue.length >= 3) {
      setDuplicateCheckQuery(newValue);
      setShowDuplicateCheck(true);
    }
  };

  const handleTogglePropertyArray = (index: number) => {
    const updated = [...properties];
    const prop = updated[index];
    
    if (prop.isArray) {
      const firstValue = Array.isArray(prop.value) ? (prop.value[0] || '') : prop.value;
      updated[index] = { ...prop, value: firstValue, isArray: false };
    } else {
      const arrayValue = prop.value ? [prop.value as string] : [];
      updated[index] = { ...prop, value: arrayValue, isArray: true };
    }
    
    setProperties(updated);
  };

  const handleAddArrayItem = (propIndex: number) => {
    const updated = [...properties];
    const prop = updated[propIndex];
    if (prop.isArray && Array.isArray(prop.value)) {
      updated[propIndex].value = [...prop.value, ''];
      setProperties(updated);
    }
  };

  const handleRemoveArrayItem = (propIndex: number, itemIndex: number) => {
    const updated = [...properties];
    const prop = updated[propIndex];
    if (prop.isArray && Array.isArray(prop.value)) {
      updated[propIndex].value = prop.value.filter((_, i) => i !== itemIndex);
      setProperties(updated);
    }
  };

  const handleArrayItemChange = (propIndex: number, itemIndex: number, newValue: string) => {
    const updated = [...properties];
    const prop = updated[propIndex];
    if (prop.isArray && Array.isArray(prop.value)) {
      const newArray = [...prop.value];
      newArray[itemIndex] = newValue;
      updated[propIndex].value = newArray;
      setProperties(updated);
    }
  };

  // MODIFIED: Updated to use new search API format
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

  const handleAddRelationship = (targetNode: SearchResult) => {
    if (!relType.trim()) {
      setError('Please enter a relationship type');
      return;
    }
    
    const validation = validateLabel(relType.trim());
    if (!validation.valid) {
      setError(validation.error || 'Invalid relationship type');
      return;
    }
    
    const targetLabel = targetNode.properties.display_name 
      || targetNode.properties.name 
      || targetNode.properties.title 
      || targetNode.nodeId;
    
    const newRel: StagedRelationship = {
      id: `temp_${Date.now()}_${Math.random()}`,
      type: relType.trim(),
      direction: relDirection,
      targetNodeId: targetNode.nodeId,
      targetNodeLabel: targetLabel
    };
    
    setRelationships([...relationships, newRel]);
    setRelType('');
    setRelSearchQuery('');
    setRelSearchResults([]);
    setError('');
  };

  const handleRemoveRelationship = (id: string) => {
    setRelationships(relationships.filter(r => r.id !== id));
  };

  // NEW: Duplicate check handler
  const handleDuplicateCheck = async () => {
    setDuplicateError('');
    setDuplicateSearching(true);

    if (!duplicateCheckQuery.trim() || duplicateCheckQuery.length < 2) {
      setDuplicateError('Please enter at least 2 characters to search');
      setDuplicateSearching(false);
      return;
    }

    try {
      let response;
      
      // Use label filtering if labels are specified
      if (labels.length > 0) {
        const options: SearchOptions = {
          query: duplicateCheckQuery,
          labels: labels,
        };
        response = await searchNodes(options);
      } else {
        response = await searchNodes(duplicateCheckQuery);
      }
      
      if (!response.ok) {
        throw new Error(`Search failed: ${response.status} ${response.statusText}`);
      }
      
      const data: SearchResponse = await response.json();
      setDuplicateResults(data.results || []);
    } catch (error) {
      setDuplicateError(error instanceof Error ? error.message : 'Search failed');
    } finally {
      setDuplicateSearching(false);
    }
  };

  // NEW: Helper functions for duplicate detection
  const getDisplayName = (result: SearchResult): string => {
    return result.properties.display_name || 
           result.properties.name || 
           result.properties.title || 
           result.nodeId || 
           'Unknown';
  };

  const getScoreColor = (score: number): string => {
    if (score >= 200) return 'danger';
    if (score >= 100) return 'warning';
    return 'info';
  };

  const getMatchTypeLabel = (matchType?: 'exact' | 'prefix' | 'substring'): string => {
    switch (matchType) {
      case 'exact': return 'Exact match - likely duplicate!';
      case 'prefix': return 'Starts with query';
      case 'substring': return 'Contains query';
      default: return '';
    }
  };

  const handleSubmit = async () => {
    setError('');
    
    if (labels.length === 0) {
      setError('At least one label is required');
      setActiveTab('labels');
      return;
    }
    
    for (const label of labels) {
      const validation = validateLabel(label);
      if (!validation.valid) {
        setError(`Invalid label "${label}": ${validation.error}`);
        setActiveTab('labels');
        return;
      }
    }
    
    for (const prop of properties) {
      const validation = validatePropertyKey(prop.key);
      if (!validation.valid) {
        setError(`Invalid property key "${prop.key}": ${validation.error}`);
        setActiveTab('properties');
        return;
      }
    }
    
    const propsObject: Record<string, any> = {};
    for (const prop of properties) {
      if (prop.isArray && Array.isArray(prop.value)) {
        const cleaned = prop.value.filter(v => v.trim() !== '');
        if (cleaned.length > 0) {
          propsObject[prop.key] = cleaned;
        }
      } else if (!prop.isArray) {
        const value = prop.value as string;
        if (value.trim() !== '') {
          propsObject[prop.key] = value.trim();
        }
      }
    }
    
    try {
      setLoading(true);
      
      const nodeResponse = await createNode(labels, propsObject);
      const nodeData = await nodeResponse.json();
      
      if (!nodeResponse.ok) {
        throw new Error(nodeData.message || nodeData.error || 'Failed to create node');
      }
      
      const newNodeId = nodeData.node.id || nodeData.node.nodeId;
      
      const relationshipPromises = relationships.map(async (rel) => {
        const fromId = rel.direction === 'outgoing' ? newNodeId : rel.targetNodeId;
        const toId = rel.direction === 'outgoing' ? rel.targetNodeId : newNodeId;
        
        return createRelationship(fromId, toId, rel.type);
      });
      
      await Promise.all(relationshipPromises);
      
      router.push(`/info?id=${encodeURIComponent(newNodeId)}`);
    } catch (err) {
      console.error('Create node error:', err);
      setError(err instanceof Error ? err.message : 'Failed to create node');
      setLoading(false);
    }
  };

  const handleCancel = () => {
    router.push('/');
  };

  if (!authChecked) {
    return (
      <div>
        <Header 
          isAuthenticated={isAuthenticated}
          username={username}
          onAuthChange={checkAuthStatus} 
        />
        <div id="create-page-container">
          <div className="create-loading-container">
            <div className="create-loading-spinner" role="status">
              <span className="create-loading-text">Loading...</span>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div>
      <Header 
        isAuthenticated={isAuthenticated}
        username={username}
        onAuthChange={checkAuthStatus} 
      />
      
      <div id="create-page-container">
        <h1 className="create-page-title">Create New Node</h1>
        
        {error && (
          <div className="create-alert create-alert-danger">
            {error}
            <button type="button" className="create-alert-close" onClick={() => setError('')}>×</button>
          </div>
        )}
        
        <ul className="create-tabs">
          <li className="create-tab-item">
            <button 
              className={`create-tab-button ${activeTab === 'labels' ? 'active' : ''}`}
              onClick={() => setActiveTab('labels')}
            >
              Labels {labels.length > 0 && <span className="create-tab-badge">{labels.length}</span>}
            </button>
          </li>
          <li className="create-tab-item">
            <button 
              className={`create-tab-button ${activeTab === 'properties' ? 'active' : ''}`}
              onClick={() => setActiveTab('properties')}
            >
              Properties {properties.length > 0 && <span className="create-tab-badge">{properties.length}</span>}
            </button>
          </li>
          <li className="create-tab-item">
            <button 
              className={`create-tab-button ${activeTab === 'relationships' ? 'active' : ''}`}
              onClick={() => setActiveTab('relationships')}
            >
              Relationships {relationships.length > 0 && <span className="create-tab-badge">{relationships.length}</span>}
            </button>
          </li>
        </ul>
        
        {activeTab === 'labels' && (
          <div className="create-tab-content active">
            <h3 className="create-section-title">Node Labels</h3>
            <p className="create-section-description">
              Labels categorize your node (e.g., Author, Text, Edition). At least one label is required.
            </p>
            
            <div className="create-input-group">
              <input
                type="text"
                placeholder="Enter label (e.g., Author, Text)"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddLabel()}
              />
              <button className="create-add-button" onClick={handleAddLabel}>
                Add Label
              </button>
            </div>
            
            {labels.length > 0 && (
              <div className="create-labels-list">
                {labels.map((label, index) => (
                  <div key={index} className="create-label-item">
                    <span className="create-label-badge">{label}</span>
                    <button className="create-remove-button" onClick={() => handleRemoveLabel(index)}>
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
            
            {labels.length === 0 && (
              <div className="create-empty-state">
                No labels added yet. Add at least one label to continue.
              </div>
            )}
          </div>
        )}
        
        {activeTab === 'properties' && (
          <div className="create-tab-content active">
            <h3 className="create-section-title">Node Properties</h3>
            <p className="create-section-description">
              Properties store data about your node. They can be single values or lists.
            </p>
            
            {/* Duplicate Check Section - integrated into properties tab */}
            {showDuplicateCheck && (
              <div className="create-property-card" style={{ borderColor: '#ffc107', backgroundColor: '#fff3cd' }}>
                <div className="create-property-card-body">
                  <div className="create-property-key-row">
                    <h4 style={{ margin: 0, fontSize: '1rem' }}>⚠️ Check for Duplicates</h4>
                    <button 
                      className="create-toggle-array-button"
                      onClick={() => setShowDuplicateCheck(false)}
                      style={{ padding: '0.25rem 0.5rem' }}
                    >
                      Hide
                    </button>
                  </div>
                  
                  <p style={{ marginTop: '0.5rem', marginBottom: '0.75rem', fontSize: '0.875rem' }}>
                    Before creating, check if a similar node already exists:
                  </p>
                  
                  <div className="create-search-group">
                    <input
                      type="text"
                      placeholder="Search for similar nodes..."
                      value={duplicateCheckQuery}
                      onChange={(e) => setDuplicateCheckQuery(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleDuplicateCheck()}
                    />
                    <button 
                      className="create-search-button"
                      onClick={handleDuplicateCheck}
                      disabled={duplicateSearching}
                    >
                      {duplicateSearching ? 'Searching...' : 'Search'}
                    </button>
                  </div>

                  {duplicateError && (
                    <div className="create-alert create-alert-danger" style={{ marginTop: '0.75rem' }}>
                      {duplicateError}
                    </div>
                  )}

                  {duplicateResults.length > 0 && (
                    <div style={{ marginTop: '1rem' }}>
                      <h5 style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                        Found {duplicateResults.length} similar node{duplicateResults.length !== 1 ? 's' : ''}:
                      </h5>
                      <div className="create-search-results" style={{ maxHeight: '250px', overflowY: 'auto' }}>
                        {duplicateResults.map((result, idx) => {
                          const label = (result.labels || []).find(l => l !== 'Entity') || 'Node';
                          const displayName = getDisplayName(result);
                          const scoreColorClass = getScoreColor(result.score);
                          
                          return (
                            <a
                              key={idx}
                              className="create-search-result-item"
                              href={`/info?id=${encodeURIComponent(result.nodeId)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ display: 'block', marginBottom: '0.5rem', textDecoration: 'none' }}
                            >
                              <div className="create-search-result-header">
                                <div style={{ flex: 1 }}>
                                  <div className="create-search-result-title">
                                    <strong>{label}</strong>: {escapeHtml(displayName)}
                                  </div>
                                  {result.matchedProperty && (
                                    <div className="create-search-result-labels" style={{ fontSize: '0.75rem' }}>
                                      {getMatchTypeLabel(result.matchType)} in <strong>{result.matchedProperty}</strong>
                                    </div>
                                  )}
                                </div>
                                <span 
                                  className={`create-tab-badge`}
                                  style={{ 
                                    backgroundColor: scoreColorClass === 'danger' ? '#dc3545' : 
                                                    scoreColorClass === 'warning' ? '#ffc107' : '#0dcaf0',
                                    color: scoreColorClass === 'warning' ? '#000' : '#fff',
                                    marginLeft: '0.5rem'
                                  }}
                                >
                                  {Math.round(result.score)}
                                </span>
                              </div>
                            </a>
                          );
                        })}
                      </div>
                      {duplicateResults.some(r => r.score >= 200) && (
                        <div className="create-alert create-alert-danger" style={{ marginTop: '0.75rem' }}>
                          <strong>⚠️ High similarity detected!</strong> Consider editing the existing node instead of creating a duplicate.
                        </div>
                      )}
                    </div>
                  )}

                  {duplicateResults.length === 0 && !duplicateError && duplicateCheckQuery && !duplicateSearching && (
                    <div style={{ marginTop: '0.75rem', padding: '0.75rem', backgroundColor: '#d1e7dd', borderRadius: '0.25rem', color: '#0f5132' }}>
                      ✓ No similar nodes found. You're good to create this node!
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Manual duplicate check button when panel is hidden */}
            {!showDuplicateCheck && properties.length > 0 && (
              <button
                className="create-toggle-array-button"
                onClick={() => {
                  // Try to pre-fill with name/title if available
                  const nameProperty = properties.find(p => 
                    ['name', 'title', 'display_name'].includes(p.key.toLowerCase()) && 
                    !p.isArray &&
                    typeof p.value === 'string'
                  );
                  if (nameProperty && nameProperty.value) {
                    setDuplicateCheckQuery(nameProperty.value as string);
                  }
                  setShowDuplicateCheck(true);
                }}
                style={{ marginBottom: '1rem', backgroundColor: '#ffc107', color: '#000' }}
              >
                🔍 Check for Duplicates
              </button>
            )}
            
            {properties.length > 0 && properties.map((prop, propIndex) => (
              <div key={propIndex} className="create-property-card">
                <div className="create-property-card-body">
                  <div className="create-property-key-row">
                    <input 
                      type="text" 
                      className="create-property-key-input" 
                      value={prop.key}
                      onChange={(e) => handlePropertyKeyChange(propIndex, e.target.value)}
                      placeholder="Property name"
                    />
                    <button className="create-delete-button" onClick={() => handleRemoveProperty(propIndex)}>
                      Delete
                    </button>
                  </div>
                  
                  <label className="create-value-label">
                    Value <span className="create-value-label-badge">
                      {prop.isArray ? `(List with ${Array.isArray(prop.value) ? prop.value.length : 0} item${Array.isArray(prop.value) && prop.value.length !== 1 ? 's' : ''})` : '(Single Value)'}
                    </span>
                  </label>
                  
                  {!prop.isArray ? (
                    <div>
                      {LONG_TEXT_PROPERTIES.includes(prop.key) ? (
                        <textarea
                          className="create-value-textarea"
                          value={prop.value as string}
                          onChange={(e) => handlePropertyValueChange(propIndex, e.target.value)}
                          placeholder={`Enter ${prop.key}`}
                        />
                      ) : (
                        <input
                          type="text"
                          className="create-value-input"
                          value={prop.value as string}
                          onChange={(e) => handlePropertyValueChange(propIndex, e.target.value)}
                          placeholder={`Enter ${prop.key}`}
                        />
                      )}
                      <button
                        className="create-toggle-array-button"
                        onClick={() => handleTogglePropertyArray(propIndex)}
                      >
                        Convert to List
                      </button>
                    </div>
                  ) : (
                    <div>
                      {Array.isArray(prop.value) && prop.value.map((item, itemIndex) => (
                        <div key={itemIndex} className="create-array-item">
                          {LONG_TEXT_PROPERTIES.includes(prop.key) ? (
                            <textarea
                              value={item}
                              onChange={(e) => handleArrayItemChange(propIndex, itemIndex, e.target.value)}
                              placeholder={`${prop.key} item ${itemIndex + 1}`}
                            />
                          ) : (
                            <input
                              type="text"
                              value={item}
                              onChange={(e) => handleArrayItemChange(propIndex, itemIndex, e.target.value)}
                              placeholder={`${prop.key} item ${itemIndex + 1}`}
                            />
                          )}
                          <button
                            className="create-array-item-remove"
                            onClick={() => handleRemoveArrayItem(propIndex, itemIndex)}
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                      <div className="create-array-controls">
                        <button
                          className="create-add-item-button"
                          onClick={() => handleAddArrayItem(propIndex)}
                        >
                          + Add Item
                        </button>
                        <button
                          className="create-toggle-array-button"
                          onClick={() => handleTogglePropertyArray(propIndex)}
                        >
                          Convert to Single Value
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Add Properties Button */}
            <div className="create-input-group">
              <input
                type="text"
                placeholder="Property name (e.g., name, title, author)"
                value={newPropertyKey}
                onChange={(e) => setNewPropertyKey(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddProperty()}
              />
              <button className="create-add-button" onClick={handleAddProperty}>
                Add Property
              </button>
            </div>
            
            {properties.length === 0 && (
              <div className="create-empty-state">
                No properties added yet. Properties are optional but recommended.
              </div>
            )}
          </div>
        )}
        
        {activeTab === 'relationships' && (
          <div className="create-tab-content active">
            <h3 className="create-section-title">Node Relationships</h3>
            <p className="create-section-description">
              Connect this node to existing nodes in the database. Relationships are optional.
            </p>
            
            <div className="create-rel-form-card">
              <div className="create-rel-form-body">
                <div className="create-rel-row">
                  <div className="create-rel-col">
                    <label className="create-rel-label">Relationship Type</label>
                    <input
                      type="text"
                      className="create-rel-input"
                      placeholder="e.g., WROTE, PUBLISHED_BY"
                      value={relType}
                      onChange={(e) => setRelType(e.target.value)}
                    />
                  </div>
                  <div className="create-rel-col">
                    <label className="create-rel-label">Direction</label>
                    <select 
                      className="create-rel-select"
                      value={relDirection}
                      onChange={(e) => setRelDirection(e.target.value as 'outgoing' | 'incoming')}
                    >
                      <option value="outgoing">Outgoing (New Node → Target)</option>
                      <option value="incoming">Incoming (Target → New Node)</option>
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
                    <label className="create-rel-label">Search Results</label>
                    <div className="create-search-results">
                      {relSearchResults.map((node) => {
                        const displayLabel = node.properties.display_name 
                          || node.properties.name 
                          || node.properties.title 
                          || node.nodeId;
                        const nodeLabels = (node.labels || []).filter(l => l !== 'Entity').join(', ');
                        
                        return (
                          <button
                            key={node.nodeId}
                            className="create-search-result-item"
                            onClick={() => handleAddRelationship(node)}
                          >
                            <div className="create-search-result-header">
                              <div>
                                <div className="create-search-result-title">{displayLabel}</div>
                                <div className="create-search-result-labels">{nodeLabels}</div>
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
            
            {relationships.length > 0 && (
              <div>
                <h4 className="create-staged-title">Staged Relationships</h4>
                <div className="create-staged-list">
                  {relationships.map((rel) => (
                    <div key={rel.id} className="create-staged-item">
                      <div className="create-staged-item-content">
                        <div className="create-staged-rel-text">
                          {rel.direction === 'outgoing' ? (
                            <>
                              <strong>(New Node)</strong>
                              <span className="create-staged-rel-type">—[{rel.type}]→</span>
                              <strong>{rel.targetNodeLabel}</strong>
                            </>
                          ) : (
                            <>
                              <strong>{rel.targetNodeLabel}</strong>
                              <span className="create-staged-rel-type">—[{rel.type}]→</span>
                              <strong>(New Node)</strong>
                            </>
                          )}
                        </div>
                        <button 
                          className="create-remove-button"
                          onClick={() => handleRemoveRelationship(rel.id)}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {relationships.length === 0 && (
              <div className="create-empty-state">
                No relationships staged. Relationships are optional.
              </div>
            )}
          </div>
        )}
        
        <div className="create-actions">
          <button
            className="create-submit-button"
            onClick={handleSubmit}
            disabled={loading || labels.length === 0}>
            {loading ? (
              <>
                <span className="create-spinner" role="status" aria-hidden="true"></span>
                Creating...
              </>
            ) : (
              'Create Node'
            )}
          </button>
          <button
            className="create-cancel-button"
            onClick={handleCancel}
            disabled={loading}
          >
            Cancel
          </button>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default CreateNodePage;
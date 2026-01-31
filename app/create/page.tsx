'use client'

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../AuthContext';
import Header from '../Header';
import { createNode, createRelationship, searchNodes } from '@/lib/api';
import { validateLabel, validatePropertyKey } from '@/lib/utils';

// Properties that should use textarea instead of input
const LONG_TEXT_PROPERTIES = ['description', 'contents', 'summary', 'biography', 'analysis'];

interface Property {
  key: string;
  value: string | string[];
  isArray: boolean;
}

interface StagedRelationship {
  id: string; // temporary ID for UI tracking
  type: string;
  direction: 'outgoing' | 'incoming';
  targetNodeId: string;
  targetNodeLabel: string;
}

interface SearchResult {
  id: string;
  labels: string[];
  properties: {
    name?: string;
    title?: string;
    display_name?: string;
    [key: string]: any;
  };
}

const CreateNodePage = () => {
  const router = useRouter();
  const { isAuthenticated, username, checkAuthStatus } = useAuth();
  
  // Node data
  const [labels, setLabels] = useState<string[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [relationships, setRelationships] = useState<StagedRelationship[]>([]);
  
  // UI state
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'labels' | 'properties' | 'relationships'>('labels');
  
  // Label input
  const [newLabel, setNewLabel] = useState<string>('');
  
  // Property input
  const [newPropertyKey, setNewPropertyKey] = useState<string>('');
  
  // Relationship input
  const [relType, setRelType] = useState<string>('');
  const [relDirection, setRelDirection] = useState<'outgoing' | 'incoming'>('outgoing');
  const [relSearchQuery, setRelSearchQuery] = useState<string>('');
  const [relSearchResults, setRelSearchResults] = useState<SearchResult[]>([]);
  const [relSearching, setRelSearching] = useState<boolean>(false);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/');
      return;
    }
    
    // Load initial label from URL if present
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const label = params.get('label');
      if (label) {
        setLabels([label]);
      }
    }
  }, [isAuthenticated]);

  // --- Label Management ---
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

  // --- Property Management ---
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

  const handlePropertyValueChange = (index: number, newValue: string | string[]) => {
    const updated = [...properties];
    updated[index].value = newValue;
    setProperties(updated);
  };

  const handleTogglePropertyArray = (index: number) => {
    const updated = [...properties];
    const prop = updated[index];
    
    if (prop.isArray) {
      // Convert array to single value
      const firstValue = Array.isArray(prop.value) ? (prop.value[0] || '') : prop.value;
      updated[index] = { ...prop, value: firstValue, isArray: false };
    } else {
      // Convert single value to array
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

  // --- Relationship Management ---
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
      
      const data = await response.json();
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
      || targetNode.id;
    
    const newRel: StagedRelationship = {
      id: `temp_${Date.now()}_${Math.random()}`,
      type: relType.trim(),
      direction: relDirection,
      targetNodeId: targetNode.id,
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

  // --- Form Submission ---
  const handleSubmit = async () => {
    setError('');
    
    // Validation
    if (labels.length === 0) {
      setError('At least one label is required');
      setActiveTab('labels');
      return;
    }
    
    // Validate all labels
    for (const label of labels) {
      const validation = validateLabel(label);
      if (!validation.valid) {
        setError(`Invalid label "${label}": ${validation.error}`);
        setActiveTab('labels');
        return;
      }
    }
    
    // Validate all property keys
    for (const prop of properties) {
      const validation = validatePropertyKey(prop.key);
      if (!validation.valid) {
        setError(`Invalid property key "${prop.key}": ${validation.error}`);
        setActiveTab('properties');
        return;
      }
    }
    
    // Build properties object
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
      
      // Step 1: Create the node
      const nodeResponse = await createNode(labels, propsObject);
      const nodeData = await nodeResponse.json();
      
      if (!nodeResponse.ok) {
        throw new Error(nodeData.message || nodeData.error || 'Failed to create node');
      }
      
      const newNodeId = nodeData.node.id || nodeData.node.nodeId;
      
      // Step 2: Create all relationships
      const relationshipPromises = relationships.map(async (rel) => {
        const fromId = rel.direction === 'outgoing' ? newNodeId : rel.targetNodeId;
        const toId = rel.direction === 'outgoing' ? rel.targetNodeId : newNodeId;
        
        return createRelationship(fromId, toId, rel.type);
      });
      
      await Promise.all(relationshipPromises);
      
      // Redirect to the new node's info page
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
      
      <div className="container mt-4" style={{ maxWidth: '900px' }}>
        <h1 className="mb-4">Create New Node</h1>
        
        {error && (
          <div className="alert alert-danger alert-dismissible fade show" role="alert">
            {error}
            <button type="button" className="btn-close" onClick={() => setError('')}></button>
          </div>
        )}
        
        {/* Tab Navigation */}
        <ul className="nav nav-tabs mb-4">
          <li className="nav-item">
            <button 
              className={`nav-link ${activeTab === 'labels' ? 'active' : ''}`}
              onClick={() => setActiveTab('labels')}
            >
              Labels {labels.length > 0 && `(${labels.length})`}
            </button>
          </li>
          <li className="nav-item">
            <button 
              className={`nav-link ${activeTab === 'properties' ? 'active' : ''}`}
              onClick={() => setActiveTab('properties')}
            >
              Properties {properties.length > 0 && `(${properties.length})`}
            </button>
          </li>
          <li className="nav-item">
            <button 
              className={`nav-link ${activeTab === 'relationships' ? 'active' : ''}`}
              onClick={() => setActiveTab('relationships')}
            >
              Relationships {relationships.length > 0 && `(${relationships.length})`}
            </button>
          </li>
        </ul>
        
        {/* Labels Tab */}
        {activeTab === 'labels' && (
          <div>
            <div className="mb-4">
              <h3 className="h5 mb-3">Node Labels</h3>
              <p className="text-muted small">
                Labels categorize your node (e.g., Author, Text, Edition). At least one label is required.
              </p>
              
              {/* Add Label Form */}
              <div className="input-group mb-3">
                <input
                  type="text"
                  className="form-control"
                  placeholder="Enter label (e.g., Author, Text)"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddLabel()}
                />
                <button 
                  className="btn btn-primary" 
                  onClick={handleAddLabel}
                >
                  Add Label
                </button>
              </div>
              
              {/* Labels List */}
              {labels.length > 0 && (
                <div className="card">
                  <ul className="list-group list-group-flush">
                    {labels.map((label, index) => (
                      <li key={index} className="list-group-item d-flex justify-content-between align-items-center">
                        <span className="badge bg-primary" style={{ fontSize: '1rem' }}>{label}</span>
                        <button 
                          className="btn btn-sm btn-danger"
                          onClick={() => handleRemoveLabel(index)}
                        >
                          Remove
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              {labels.length === 0 && (
                <div className="alert alert-info">
                  No labels added yet. Add at least one label to continue.
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Properties Tab */}
        {activeTab === 'properties' && (
          <div>
            <div className="mb-4">
              <h3 className="h5 mb-3">Node Properties</h3>
              <p className="text-muted small">
                Properties store data about your node. They can be single values or lists.
              </p>
              
              {/* Add Property Form */}
              <div className="input-group mb-3">
                <input
                  type="text"
                  className="form-control"
                  placeholder="Property name (e.g., name, title, author)"
                  value={newPropertyKey}
                  onChange={(e) => setNewPropertyKey(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddProperty()}
                />
                <button 
                  className="btn btn-primary" 
                  onClick={handleAddProperty}
                >
                  Add Property
                </button>
              </div>
              
              {/* Properties List */}
              {properties.length > 0 && (
                <div className="mb-3">
                  {properties.map((prop, propIndex) => (
                    <div key={propIndex} className="card mb-3">
                      <div className="card-body">
                        {/* Property Key */}
                        <div className="mb-3">
                          <label className="form-label fw-bold">Property Name</label>
                          <div className="d-flex gap-2">
                            <input 
                              type="text" 
                              className="form-control flex-grow-1" 
                              value={prop.key}
                              onChange={(e) => handlePropertyKeyChange(propIndex, e.target.value)}
                            />
                            <button 
                              className="btn btn-danger"
                              onClick={() => handleRemoveProperty(propIndex)}
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                        
                        {/* Property Value */}
                        <div>
                          <label className="form-label fw-bold">
                            Value {prop.isArray ? `(List with ${Array.isArray(prop.value) ? prop.value.length : 0} item${Array.isArray(prop.value) && prop.value.length !== 1 ? 's' : ''})` : '(Single Value)'}
                          </label>
                          
                          {!prop.isArray ? (
                            // Single value input
                            <div>
                              {LONG_TEXT_PROPERTIES.includes(prop.key) ? (
                                <textarea
                                  className="form-control"
                                  rows={6}
                                  value={prop.value as string}
                                  onChange={(e) => handlePropertyValueChange(propIndex, e.target.value)}
                                  placeholder={`Enter ${prop.key}`}
                                />
                              ) : (
                                <input
                                  type="text"
                                  className="form-control"
                                  value={prop.value as string}
                                  onChange={(e) => handlePropertyValueChange(propIndex, e.target.value)}
                                  placeholder={`Enter ${prop.key}`}
                                />
                              )}
                              <button
                                className="btn btn-sm btn-outline-secondary mt-2"
                                onClick={() => handleTogglePropertyArray(propIndex)}
                              >
                                Convert to List
                              </button>
                            </div>
                          ) : (
                            // Array value inputs
                            <div>
                              {Array.isArray(prop.value) && prop.value.map((item, itemIndex) => (
                                <div key={itemIndex} className="mb-2 d-flex gap-2">
                                  {LONG_TEXT_PROPERTIES.includes(prop.key) ? (
                                    <textarea
                                      className="form-control flex-grow-1"
                                      rows={3}
                                      value={item}
                                      onChange={(e) => handleArrayItemChange(propIndex, itemIndex, e.target.value)}
                                      placeholder={`${prop.key} item ${itemIndex + 1}`}
                                    />
                                  ) : (
                                    <input
                                      type="text"
                                      className="form-control flex-grow-1"
                                      value={item}
                                      onChange={(e) => handleArrayItemChange(propIndex, itemIndex, e.target.value)}
                                      placeholder={`${prop.key} item ${itemIndex + 1}`}
                                    />
                                  )}
                                  <button
                                    className="btn btn-sm btn-danger"
                                    onClick={() => handleRemoveArrayItem(propIndex, itemIndex)}
                                  >
                                    ✕
                                  </button>
                                </div>
                              ))}
                              <div className="d-flex gap-2 mt-2">
                                <button
                                  className="btn btn-sm btn-secondary"
                                  onClick={() => handleAddArrayItem(propIndex)}
                                >
                                  + Add Item
                                </button>
                                <button
                                  className="btn btn-sm btn-outline-secondary"
                                  onClick={() => handleTogglePropertyArray(propIndex)}
                                >
                                  Convert to Single Value
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {properties.length === 0 && (
                <div className="alert alert-info">
                  No properties added yet. Properties are optional but recommended.
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Relationships Tab */}
        {activeTab === 'relationships' && (
          <div>
            <div className="mb-4">
              <h3 className="h5 mb-3">Node Relationships</h3>
              <p className="text-muted small">
                Connect this node to existing nodes in the database. Relationships are optional.
              </p>
              
              {/* Add Relationship Form */}
              <div className="card mb-3">
                <div className="card-body">
                  <div className="row mb-3">
                    <div className="col-md-6">
                      <label className="form-label">Relationship Type</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="e.g., WROTE, PUBLISHED_BY, EDITION_OF"
                        value={relType}
                        onChange={(e) => setRelType(e.target.value)}
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Direction</label>
                      <select 
                        className="form-select"
                        value={relDirection}
                        onChange={(e) => setRelDirection(e.target.value as 'outgoing' | 'incoming')}
                      >
                        <option value="outgoing">Outgoing (New Node → Target)</option>
                        <option value="incoming">Incoming (Target → New Node)</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className="mb-3">
                    <label className="form-label">Search for Target Node</label>
                    <div className="input-group">
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Search for a node..."
                        value={relSearchQuery}
                        onChange={(e) => setRelSearchQuery(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSearchRelTarget()}
                      />
                      <button 
                        className="btn btn-secondary" 
                        onClick={handleSearchRelTarget}
                        disabled={relSearching}
                      >
                        {relSearching ? 'Searching...' : 'Search'}
                      </button>
                    </div>
                  </div>
                  
                  {/* Search Results */}
                  {relSearchResults.length > 0 && (
                    <div>
                      <label className="form-label">Search Results</label>
                      <div className="list-group">
                        {relSearchResults.map((node) => {
                          const displayLabel = node.properties.display_name 
                            || node.properties.name 
                            || node.properties.title 
                            || node.id;
                          const nodeLabels = (node.labels || []).filter(l => l !== 'Entity').join(', ');
                          
                          return (
                            <button
                              key={node.id}
                              className="list-group-item list-group-item-action"
                              onClick={() => handleAddRelationship(node)}
                            >
                              <div className="d-flex w-100 justify-content-between">
                                <h6 className="mb-1">{displayLabel}</h6>
                                <small className="text-muted">{nodeLabels}</small>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Staged Relationships List */}
              {relationships.length > 0 && (
                <div>
                  <h4 className="h6 mb-3">Staged Relationships</h4>
                  <div className="list-group">
                    {relationships.map((rel) => (
                      <div key={rel.id} className="list-group-item">
                        <div className="d-flex justify-content-between align-items-center">
                          <div>
                            {rel.direction === 'outgoing' ? (
                              <span>
                                <strong>(New Node)</strong> 
                                <span className="mx-2">—[{rel.type}]→</span>
                                <strong>{rel.targetNodeLabel}</strong>
                              </span>
                            ) : (
                              <span>
                                <strong>{rel.targetNodeLabel}</strong>
                                <span className="mx-2">—[{rel.type}]→</span>
                                <strong>(New Node)</strong>
                              </span>
                            )}
                          </div>
                          <button 
                            className="btn btn-sm btn-danger"
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
                <div className="alert alert-info">
                  No relationships staged. Relationships are optional.
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Action Buttons */}
        <div className="d-flex gap-2 mt-4 pt-3 border-top">
          <button
            className="btn btn-primary btn-lg"
            onClick={handleSubmit}
            disabled={loading || labels.length === 0}
          >
            {loading ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                Creating...
              </>
            ) : (
              'Create Node'
            )}
          </button>
          <button
            className="btn btn-link"
            onClick={handleCancel}
            disabled={loading}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateNodePage;
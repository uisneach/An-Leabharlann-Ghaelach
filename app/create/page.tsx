'use client'

import { useState, FormEvent, ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../AuthContext';
import Header from '../Header';
import { createNode, searchNodes, SearchOptions } from '@/lib/api';
import { validateLabel, validatePropertyKey, escapeHtml } from '@/lib/utils';

// Type definitions
interface Property {
  name: string;
  value: string;
}

interface CreateNodeResponse {
  success: boolean;
  node: {
    id: string;
    labels: string[];
    properties: Record<string, any>;
  };
  message: string;
}

interface SearchResult {
  nodeId: string;
  labels: string[];
  properties: {
    name?: string;
    title?: string;
    display_name?: string;
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

// Main Create Node Page Component
const CreateNodePage = () => {
  const router = useRouter();
  const { isAuthenticated, username, checkAuthStatus } = useAuth();
  
  const [nodeLabels, setNodeLabels] = useState<string>('');
  const [properties, setProperties] = useState<Property[]>([{ name: '', value: '' }]);
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  // Search state for checking duplicates
  const [showDuplicateCheck, setShowDuplicateCheck] = useState<boolean>(false);
  const [duplicateCheckQuery, setDuplicateCheckQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState<boolean>(false);
  const [searchError, setSearchError] = useState<string>('');

  // Load label from URL params on mount
  useState(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const label = params.get('label');
      if (label) {
        setNodeLabels(label);
      }
    }
  });

  const handleAddProperty = () => {
    setProperties([...properties, { name: '', value: '' }]);
  };

  const handleRemoveProperty = (index: number) => {
    if (properties.length > 1) {
      setProperties(properties.filter((_, i) => i !== index));
    }
  };

  const handlePropertyChange = (index: number, field: 'name' | 'value', value: string) => {
    const newProperties = [...properties];
    newProperties[index][field] = value;
    setProperties(newProperties);
  };

  // Search for potential duplicates
  const handleDuplicateCheck = async () => {
    setSearchError('');
    setSearchLoading(true);

    if (!duplicateCheckQuery.trim() || duplicateCheckQuery.length < 2) {
      setSearchError('Please enter at least 2 characters to search');
      setSearchLoading(false);
      return;
    }

    try {
      // Build search options with label filter if available
      const labelsInput = nodeLabels.trim();
      const labels = labelsInput.split(',').map(label => label.trim()).filter(label => label);
      
      let response;
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
      setSearchResults(data.results || []);
    } catch (error) {
      setSearchError(error instanceof Error ? error.message : 'Search failed');
    } finally {
      setSearchLoading(false);
    }
  };

  // Auto-search when a name/title property is entered
  const handlePropertyValueChange = (index: number, value: string) => {
    handlePropertyChange(index, 'value', value);
    
    const propertyName = properties[index].name.toLowerCase();
    if ((propertyName === 'name' || propertyName === 'title' || propertyName === 'display_name') && 
        value.length >= 3) {
      setDuplicateCheckQuery(value);
      setShowDuplicateCheck(true);
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');

    // Validate and collect labels
    const labelsInput = nodeLabels.trim();
    const labels = labelsInput.split(',').map(label => label.trim()).filter(label => label);
    
    if (!labels.length) {
      setError('At least one label is required');
      return;
    }
    
    // Validate each label
    for (const label of labels) {
      const validation = validateLabel(label);
      if (!validation.valid) {
        setError(validation.error || 'Invalid label format');
        return;
      }
    }

    // Collect properties (optional)
    const propsObject: Record<string, any> = {};
    
    for (const prop of properties) {
      const name = prop.name.trim();
      const value = prop.value.trim();
      
      if (name) {
        const validation = validatePropertyKey(name);
        if (!validation.valid) {
          setError(validation.error || 'Invalid property key');
          return;
        }
        propsObject[name] = value || null;
      }
    }

    try {
      setLoading(true);
      
      // Create node
      const nodeResponse = await createNode(labels, propsObject);
      const nodeData: CreateNodeResponse = await nodeResponse.json();
      
      if (!nodeResponse.ok) {
        throw new Error(nodeData.message || 'Failed to create node');
      }
      
      // Redirect to node info page
      router.push(`/info?id=${encodeURIComponent(nodeData.node.id)}`);
    } catch (error) {
      console.error('Create node error:', error);
      setError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    router.push('/');
  };

  const getDisplayName = (result: SearchResult): string => {
    return result.properties.display_name || 
           result.properties.name || 
           result.properties.title || 
           result.nodeId || 
           'Unknown';
  };

  const getScoreColor = (score: number): string => {
    if (score >= 200) return 'danger';  // High chance of duplicate
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

  return (
    <div>
      <Header 
        isAuthenticated={isAuthenticated}
        username={username}
        onAuthChange={checkAuthStatus} 
      />
      
      <div className="container mt-4">
        <h1>Create Node</h1>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label htmlFor="nodeLabels" className="form-label">
              Node Labels (comma-separated)
            </label>
            <input
              type="text"
              className="form-control"
              id="nodeLabels"
              placeholder="e.g., Author, Edition"
              value={nodeLabels}
              onChange={(e) => setNodeLabels(e.target.value)}
              required 
            />
            <small className="text-muted">
              Labels categorize your node. Use existing labels when possible.
            </small>
          </div>
          
          <div className="mb-3">
            <label className="form-label">Properties</label>
            <table className="table table-bordered" id="propertiesTable">
              <thead>
                <tr>
                  <th scope="col" style={{ width: '30%' }}>Name</th>
                  <th scope="col" style={{ width: '60%' }}>Value</th>
                  <th scope="col" style={{ width: '10%' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {properties.map((prop, index) => (
                  <tr key={index} className="property-row">
                    <td>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="e.g., name, title"
                        value={prop.name}
                        onChange={(e) => handlePropertyChange(index, 'name', e.target.value)} 
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="e.g., Jane Doe, The Iliad"
                        value={prop.value}
                        onChange={(e) => handlePropertyValueChange(index, e.target.value)} 
                      />
                    </td>
                    <td className="text-center">
                      {properties.length > 1 && (
                        <button
                          type="button"
                          className="btn btn-sm btn-danger"
                          onClick={() => handleRemoveProperty(index)}
                          title="Remove this property"
                        >
                          ✕
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button
              type="button"
              className="btn btn-secondary mb-3"
              onClick={handleAddProperty}
            >
              + Add Property
            </button>
          </div>

          {/* Duplicate Check Section */}
          {showDuplicateCheck && (
            <div className="card mb-3" style={{ borderColor: '#ffc107' }}>
              <div className="card-header" style={{ backgroundColor: '#fff3cd' }}>
                <div className="d-flex justify-content-between align-items-center">
                  <h6 className="mb-0">Check for Duplicates</h6>
                  <button
                    type="button"
                    className="btn btn-sm btn-link"
                    onClick={() => setShowDuplicateCheck(false)}
                  >
                    Hide
                  </button>
                </div>
              </div>
              <div className="card-body">
                <p className="mb-2">
                  Before creating, check if a similar node already exists:
                </p>
                <div className="input-group mb-3">
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Search for similar nodes..."
                    value={duplicateCheckQuery}
                    onChange={(e) => setDuplicateCheckQuery(e.target.value)}
                  />
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleDuplicateCheck}
                    disabled={searchLoading}
                  >
                    {searchLoading ? 'Searching...' : 'Search'}
                  </button>
                </div>

                {searchError && (
                  <div className="alert alert-danger mb-2">
                    {searchError}
                  </div>
                )}

                {searchResults.length > 0 && (
                  <div>
                    <h6 className="mb-2">Found {searchResults.length} similar node{searchResults.length !== 1 ? 's' : ''}:</h6>
                    <div className="list-group" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                      {searchResults.map((result, idx) => {
                        const label = (result.labels || []).find(l => l !== 'Entity') || 'Node';
                        const displayName = getDisplayName(result);
                        
                        return (
                          <a
                            key={idx}
                            className="list-group-item list-group-item-action d-flex justify-content-between align-items-start"
                            href={`/info?id=${encodeURIComponent(result.nodeId)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <div className="flex-grow-1">
                              <div className="d-flex w-100 justify-content-between">
                                <h6 className="mb-1">
                                  <strong>{label}</strong>: {escapeHtml(displayName)}
                                </h6>
                                <span className={`badge bg-${getScoreColor(result.score)} ms-2`}>
                                  Score: {Math.round(result.score)}
                                </span>
                              </div>
                              {result.matchedProperty && (
                                <small className="text-muted">
                                  {getMatchTypeLabel(result.matchType)}
                                  {' '}in <strong>{result.matchedProperty}</strong>
                                </small>
                              )}
                            </div>
                          </a>
                        );
                      })}
                    </div>
                    {searchResults.some(r => r.score >= 200) && (
                      <div className="alert alert-warning mt-2 mb-0">
                        <strong>High similarity detected!</strong> Consider editing the existing node instead of creating a duplicate.
                      </div>
                    )}
                  </div>
                )}

                {searchResults.length === 0 && !searchError && duplicateCheckQuery && !searchLoading && (
                  <div className="alert alert-success mb-0">
                    ✓ No similar nodes found. You're good to create this node!
                  </div>
                )}
              </div>
            </div>
          )}

          {!showDuplicateCheck && (
            <div className="mb-3">
              <button
                type="button"
                className="btn btn-outline-warning"
                onClick={() => {
                  // Try to pre-fill search with name/title if available
                  const nameProperty = properties.find(p => 
                    ['name', 'title', 'display_name'].includes(p.name.toLowerCase())
                  );
                  if (nameProperty && nameProperty.value) {
                    setDuplicateCheckQuery(nameProperty.value);
                  }
                  setShowDuplicateCheck(true);
                }}
              >
                🔍 Check for Duplicates
              </button>
            </div>
          )}
          
          {error && (
            <div className="alert alert-danger">
              {error}
            </div>
          )}
          
          <div className="d-flex gap-2">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? 'Creating...' : 'Create Node'}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleCancel}
              disabled={loading}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateNodePage;
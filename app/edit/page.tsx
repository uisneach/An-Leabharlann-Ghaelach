'use client'
import React, { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import Header from '../Header';
import { 
  getNode, 
  getNodeRelationships,
  deleteNode,
  deleteNodeProperty,
  deleteRelationship,
  updateNodeProperties,
  addNodeLabels,
  deleteNodeLabels
} from '@/lib/api';
import { cleanString, validateLabel, validatePropertyKey } from '@/lib/utils';

interface Node {
  id: string;
  nodeId: string;
  labels: string[];
  properties: {
    display_name?: string;
    title?: string;
    name?: string;
    nodeId?: string | number;
    createdBy?: string;
    [key: string]: any;
  };
}

interface Relationship {
  type: string;
  node: Node;
}

interface NodeData extends Node {
  outgoing: Relationship[];
  incoming: Relationship[];
}

// Properties that should use textarea instead of input
const LONG_TEXT_PROPERTIES = ['description', 'contents', 'analysis', 'summary', 'biography', 'works'];

// Component for editing a single property value (handles primitives and arrays)
const PropertyValueEditor: React.FC<{
  propertyKey: string;
  value: any;
  onChange: (newValue: any) => void;
  onDelete?: () => void;
}> = ({ propertyKey, value, onChange, onDelete }) => {
  const isLongText = LONG_TEXT_PROPERTIES.includes(propertyKey);
  const isArray = Array.isArray(value);
  const [arrayValues, setArrayValues] = useState<string[]>(
    isArray ? value.map(String) : []
  );
  const [singleValue, setSingleValue] = useState<string>(
    !isArray ? String(value || '') : ''
  );

  // Sync changes back to parent
  useEffect(() => {
    if (isArray) {
      onChange(arrayValues.filter(v => v.trim() !== ''));
    } else {
      onChange(singleValue);
    }
  }, [arrayValues, singleValue]);

  const handleAddArrayItem = () => {
    setArrayValues([...arrayValues, '']);
  };

  const handleRemoveArrayItem = (index: number) => {
    setArrayValues(arrayValues.filter((_, i) => i !== index));
  };

  const handleArrayItemChange = (index: number, newValue: string) => {
    const updated = [...arrayValues];
    updated[index] = newValue;
    setArrayValues(updated);
  };

  const toggleArrayMode = () => {
    if (isArray) {
      // Convert to single value (take first item or empty string)
      const firstValue = arrayValues[0] || '';
      setSingleValue(firstValue);
      onChange(firstValue);
    } else {
      // Convert to array
      const newArray = singleValue.trim() ? [singleValue] : [];
      setArrayValues(newArray);
      onChange(newArray);
    }
  };

  if (isArray) {
    return (
      <div>
        {arrayValues.map((item, idx) => (
          <div key={idx} className="mb-2 d-flex gap-2">
            {isLongText ? (
              <textarea
                className="form-control flex-grow-1"
                rows={3}
                value={item}
                onChange={(e) => handleArrayItemChange(idx, e.target.value)}
                placeholder={`${propertyKey} item ${idx + 1}`}
              />
            ) : (
              <input
                type="text"
                className="form-control flex-grow-1"
                value={item}
                onChange={(e) => handleArrayItemChange(idx, e.target.value)}
                placeholder={`${propertyKey} item ${idx + 1}`}
              />
            )}
            <button
              className="btn btn-sm btn-danger"
              onClick={() => handleRemoveArrayItem(idx)}
              title="Remove this item"
            >
              ✕
            </button>
          </div>
        ))}
        <div className="d-flex gap-2 mt-2">
          <button
            className="btn btn-sm btn-secondary"
            onClick={handleAddArrayItem}
          >
            + Add Item
          </button>
          <button
            className="btn btn-sm btn-outline-secondary"
            onClick={toggleArrayMode}
            title="Convert to single value"
          >
            Convert to Single Value
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      {isLongText ? (
        <textarea
          className="form-control"
          rows={6}
          value={singleValue}
          onChange={(e) => setSingleValue(e.target.value)}
          placeholder={`Enter ${propertyKey}`}
        />
      ) : (
        <input
          type="text"
          className="form-control"
          value={singleValue}
          onChange={(e) => setSingleValue(e.target.value)}
          placeholder={`Enter ${propertyKey}`}
        />
      )}
      <div className="mt-2">
        <button
          className="btn btn-sm btn-outline-secondary"
          onClick={toggleArrayMode}
          title="Convert to list"
        >
          Convert to List
        </button>
      </div>
    </div>
  );
};

const EditPage = () => {
  const { isAuthenticated, username, checkAuthStatus } = useAuth();
  const [nodeData, setNodeData] = useState<NodeData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [editingSection, setEditingSection] = useState<'properties' | 'labels' | null>(null);
  const [editedProperties, setEditedProperties] = useState<Record<string, any>>({});
  const [editedLabels, setEditedLabels] = useState<string[]>([]);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      window.location.href = '/';
      return;
    }
    loadNodeData();
  }, [isAuthenticated]);

  const showTimedAlert = (message: string) => {
    setAlertMessage(message);
    setTimeout(() => setAlertMessage(null), 5000);
  };

  const loadNodeData = async () => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');

    if (!id) {
      setError('Missing node ID');
      setLoading(false);
      return;
    }

    try {
      const nodeRes = await getNode(id);
      if (nodeRes.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        checkAuthStatus();
        window.location.href = '/';
        return;
      }
      if (!nodeRes.ok) throw new Error('Failed to load node');

      const data = await nodeRes.json();
      
      const relRes = await getNodeRelationships(id);
      if (!relRes.ok) throw new Error('Failed to load relationships');
      
      const relData = await relRes.json();
      
      const fullData: NodeData = {
        ...data,
        outgoing: relData.outgoing || [],
        incoming: relData.incoming || []
      };
      
      setNodeData(fullData);
      setEditedProperties({ ...fullData.properties });
      setEditedLabels(fullData.labels.filter(l => l !== 'Entity'));
      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setLoading(false);
    }
  };

  const handleDeleteNode = async () => {
    if (!nodeData || !confirm('Are you sure you want to delete this node and all its relationships?')) return;
    
    try {
      const response = await deleteNode(nodeData.id);
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data?.error?.message || 'Failed to delete node');
      }
      window.location.href = '/';
    } catch (err) {
      showTimedAlert(err instanceof Error ? err.message : 'Failed to delete node');
    }
  };

  const handleDeleteProperty = async (key: string) => {
    if (!nodeData || !confirm(`Are you sure you want to delete the property "${key}"?`)) return;
    
    try {
      const response = await deleteNodeProperty(nodeData.id, key);
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data?.error?.message || 'Failed to delete property');
      }
      await loadNodeData();
    } catch (err) {
      showTimedAlert(err instanceof Error ? err.message : 'Failed to delete property');
    }
  };

  const handleDeleteRelationship = async (sourceId: string, targetId: string, relType: string) => {
    if (!confirm('Are you sure you want to delete this relationship?')) return;
    
    try {
      const response = await deleteRelationship(sourceId, targetId, relType);
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data?.error?.message || 'Failed to delete relationship');
      }
      await loadNodeData();
    } catch (err) {
      showTimedAlert(err instanceof Error ? err.message : 'Failed to delete relationship');
    }
  };

  const handleSaveProperties = async () => {
    if (!nodeData) return;
    
    // Validate all property keys
    for (const key of Object.keys(editedProperties)) {
      const validation = validatePropertyKey(key);
      if (!validation.valid) {
        showTimedAlert(validation.error || 'Invalid property key');
        return;
      }
    }
    
    // Clean up properties: remove empty strings from arrays, remove empty properties
    const cleanedProperties: Record<string, any> = {};
    for (const [key, value] of Object.entries(editedProperties)) {
      if (Array.isArray(value)) {
        const cleaned = value.filter(v => String(v).trim() !== '');
        if (cleaned.length > 0) {
          cleanedProperties[key] = cleaned;
        }
      } else if (String(value).trim() !== '') {
        cleanedProperties[key] = value;
      }
    }
    
    try {
      const response = await updateNodeProperties(nodeData.id, cleanedProperties);
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data?.error?.message || 'Failed to update properties');
      }
      setEditingSection(null);
      await loadNodeData();
      showTimedAlert('Properties updated successfully!');
    } catch (err) {
      showTimedAlert(err instanceof Error ? err.message : 'Failed to update properties');
    }
  };

  const handleSaveLabels = async () => {
    if (!nodeData) return;
    
    // Validate all labels
    for (const label of editedLabels) {
      const validation = validateLabel(label);
      if (!validation.valid) {
        showTimedAlert(validation.error || 'Invalid label');
        return;
      }
    }
    
    try {
      const currentLabels = nodeData.labels.filter(l => l !== 'Entity');
      const currentSet = new Set(currentLabels);
      const editedSet = new Set(editedLabels);
      
      const toAdd = editedLabels.filter(l => !currentSet.has(l));
      const toRemove = currentLabels.filter(l => !editedSet.has(l));
      
      if (toAdd.length > 0) await addNodeLabels(nodeData.id, toAdd);
      if (toRemove.length > 0) await deleteNodeLabels(nodeData.id, toRemove);
      
      setEditingSection(null);
      await loadNodeData();
      showTimedAlert('Labels updated successfully!');
    } catch (err) {
      showTimedAlert(err instanceof Error ? err.message : 'Failed to update labels');
    }
  };

  const handleAddProperty = () => {
    const newKey = prompt('Enter property name:');
    if (newKey && newKey.trim()) {
      const validation = validatePropertyKey(newKey);
      if (!validation.valid) {
        alert(validation.error);
        return;
      }
      setEditedProperties({
        ...editedProperties,
        [newKey]: ''
      });
    }
  };

  const handlePropertyKeyChange = (oldKey: string, newKey: string) => {
    if (oldKey === newKey) return;
    
    const validation = validatePropertyKey(newKey);
    if (!validation.valid) {
      alert(validation.error);
      return;
    }
    
    const newProps = { ...editedProperties };
    const value = newProps[oldKey];
    delete newProps[oldKey];
    newProps[newKey] = value;
    setEditedProperties(newProps);
  };

  const handlePropertyValueChange = (key: string, newValue: any) => {
    setEditedProperties({
      ...editedProperties,
      [key]: newValue
    });
  };

  if (loading) {
    return (
      <>
        <Header 
          isAuthenticated={isAuthenticated}
          username={username}
          onAuthChange={checkAuthStatus}
        />
        <div className="container mt-5 text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <Header 
          isAuthenticated={isAuthenticated}
          username={username}
          onAuthChange={checkAuthStatus}
        />
        <div className="container mt-5">
          <div className="alert alert-danger" role="alert">
            <h4 className="alert-heading">Error</h4>
            <p>{error}</p>
          </div>
        </div>
      </>
    );
  }

  if (!nodeData) {
    return (
      <>
        <Header 
          isAuthenticated={isAuthenticated}
          username={username}
          onAuthChange={checkAuthStatus}
        />
        <div className="container mt-5 text-center">
          <div className="p-5">
            <h2 className="text-muted mb-3">No Node Selected</h2>
            <p className="text-muted">Please select a node to edit.</p>
          </div>
        </div>
      </>
    );
  }

  const title = nodeData.properties.display_name || nodeData.properties.name || nodeData.properties.title || String(nodeData.properties.nodeId) || nodeData.nodeId;
  const labels = nodeData.labels?.filter((l: string) => l !== 'Entity') || [];

  return (
    <>
      <Header 
        isAuthenticated={isAuthenticated}
        username={username}
        onAuthChange={checkAuthStatus}
      />
      <div id="content" className="container" style={{ maxWidth: '900px' }}>
        {alertMessage && (
          <div className="alert alert-success alert-dismissible fade show mt-3" role="alert">
            {alertMessage}
            <button type="button" className="btn-close" onClick={() => setAlertMessage(null)}></button>
          </div>
        )}
        
        <div className="mt-4">
          {/* Title */}
          <div id="title-container" className="mb-4">
            <h1 className="page-title">Edit: {title}</h1>
            <h3 className="page-subtitle">{labels.join(', ')}</h3>
          </div>

          {/* Action buttons */}
          <div className="mb-4">
            <a href={`/info?id=${encodeURIComponent(nodeData.nodeId || nodeData.id)}`} className="btn btn-secondary me-2">
              Back to View
            </a>
            <button className="btn btn-danger" onClick={handleDeleteNode}>
              Delete Node
            </button>
          </div>

          {/* Edit Section Selector */}
          {!editingSection && (
            <div className="mb-4">
              <h3 className="h5 mb-3">What would you like to edit?</h3>
              <button className="btn btn-primary me-2" onClick={() => setEditingSection('properties')}>
                Edit Properties
              </button>
              <button className="btn btn-primary me-2" onClick={() => setEditingSection('labels')}>
                Edit Labels
              </button>
            </div>
          )}

          {/* Edit Properties Form */}
          {editingSection === 'properties' && (
            <div className="mb-4">
              <h3 className="h5 mb-3">Edit Properties</h3>
              <div className="mb-3">
                <small className="text-muted">
                  Tip: Properties can be single values or lists. Use "Convert to List" to store multiple values for a property.
                </small>
              </div>
              
              {Object.entries(editedProperties)
                .filter(([key]) => key !== 'nodeId' && key !== 'createdBy')
                .map(([key, value]) => (
                  <div key={key} className="card mb-3">
                    <div className="card-body">
                      <div className="mb-3">
                        <label className="form-label fw-bold">Property Name</label>
                        <div className="d-flex gap-2">
                          <input 
                            type="text" 
                            className="form-control flex-grow-1" 
                            value={key}
                            onChange={(e) => handlePropertyKeyChange(key, e.target.value)}
                          />
                          <button 
                            className="btn btn-danger"
                            onClick={() => handleDeleteProperty(key)}
                            title="Delete this property"
                          >
                            Delete Property
                          </button>
                        </div>
                      </div>
                      
                      <div>
                        <label className="form-label fw-bold">
                          Value {Array.isArray(value) ? `(List with ${value.length} item${value.length !== 1 ? 's' : ''})` : '(Single Value)'}
                        </label>
                        <PropertyValueEditor
                          propertyKey={key}
                          value={value}
                          onChange={(newValue) => handlePropertyValueChange(key, newValue)}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              
              <div className="d-flex gap-2 mt-3">
                <button 
                  className="btn btn-secondary"
                  onClick={handleAddProperty}
                >
                  + Add New Property
                </button>
                <button className="btn btn-primary" onClick={handleSaveProperties}>
                  Save All Changes
                </button>
                <button 
                  className="btn btn-link" 
                  onClick={() => {
                    setEditingSection(null);
                    setEditedProperties({ ...nodeData.properties });
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Edit Labels Form */}
          {editingSection === 'labels' && (
            <div className="mb-4">
              <h3 className="h5 mb-3">Edit Labels</h3>
              <ul className="list-unstyled" id="labelsList">
                {editedLabels.map((label, idx) => (
                  <li key={idx} className="mb-2 label-item">
                    <input 
                      type="text" 
                      className="form-control d-inline-block w-auto me-2" 
                      value={label}
                      onChange={(e) => {
                        const newLabels = [...editedLabels];
                        newLabels[idx] = e.target.value;
                        setEditedLabels(newLabels);
                      }}
                      style={{ width: '200px' }}
                    />
                    <button 
                      className="btn btn-sm btn-danger remove-label"
                      onClick={() => {
                        setEditedLabels(editedLabels.filter((_, i) => i !== idx));
                      }}
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
              <button 
                className="btn btn-secondary me-2"
                onClick={() => {
                  const newLabel = prompt('Enter label name:');
                  if (newLabel) {
                    setEditedLabels([...editedLabels, newLabel]);
                  }
                }}
              >
                Add Label
              </button>
              <button className="btn btn-primary me-2" onClick={handleSaveLabels}>
                Save Changes
              </button>
              <button 
                className="btn btn-link" 
                onClick={() => {
                  setEditingSection(null);
                  setEditedLabels(nodeData.labels.filter(l => l !== 'Entity'));
                }}
              >
                Cancel
              </button>
            </div>
          )}

          {/* Relationships Section */}
          <div className="mt-5">
            <h3 className="h4 border-bottom pb-2 mb-3">Manage Relationships</h3>
            
            {(() => {
              const allRelTypes = new Map<string, { incoming: Relationship[], outgoing: Relationship[] }>();
              
              (nodeData.incoming || []).forEach(rel => {
                if (!allRelTypes.has(rel.type)) {
                  allRelTypes.set(rel.type, { incoming: [], outgoing: [] });
                }
                allRelTypes.get(rel.type)!.incoming.push(rel);
              });
              
              (nodeData.outgoing || []).forEach(rel => {
                if (!allRelTypes.has(rel.type)) {
                  allRelTypes.set(rel.type, { incoming: [], outgoing: [] });
                }
                allRelTypes.get(rel.type)!.outgoing.push(rel);
              });
              
              return Array.from(allRelTypes.entries()).map(([relType, { incoming, outgoing }]) => (
                <div key={relType} className="rels-section mb-4">
                  <h4 className="h5">{cleanString(relType)}</h4>
                  
                  {incoming.length > 0 && (
                    <div className="mb-3">
                      <h5 className="h6 text-muted">Incoming</h5>
                      <ul className="rels-list list-unstyled">
                        {incoming.map((rel, idx) => {
                          const fromNode = rel.node;
                          const fromLabel = fromNode.properties.display_name || fromNode.properties.name || fromNode.properties.title || fromNode.nodeId;
                          const toLabel = title;
                          return (
                            <li key={idx} className="mb-2">
                              <a href={`/info?id=${encodeURIComponent(fromNode.nodeId || fromNode.id)}`}>
                                ({fromLabel})
                              </a>
                              {' '}==[{relType}]==&gt;{' '}
                              <a href={`/info?id=${encodeURIComponent(nodeData.nodeId || nodeData.id)}`}>
                                ({toLabel})
                              </a>
                              <button 
                                className="btn btn-sm btn-danger ms-2"
                                onClick={() => handleDeleteRelationship(fromNode.id, nodeData.id, relType)}
                              >
                                Delete
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}
                  
                  {outgoing.length > 0 && (
                    <div className="mb-3">
                      <h5 className="h6 text-muted">Outgoing</h5>
                      <ul className="rels-list list-unstyled">
                        {outgoing.map((rel, idx) => {
                          const toNode = rel.node;
                          const fromLabel = title;
                          const toLabel = toNode.properties.display_name || toNode.properties.name || toNode.properties.title || toNode.nodeId;
                          return (
                            <li key={idx} className="mb-2">
                              <a href={`/info?id=${encodeURIComponent(nodeData.nodeId || nodeData.id)}`}>
                                ({fromLabel})
                              </a>
                              {' '}==[{relType}]==&gt;{' '}
                              <a href={`/info?id=${encodeURIComponent(toNode.nodeId || toNode.id)}`}>
                                ({toLabel})
                              </a>
                              <button 
                                className="btn btn-sm btn-danger ms-2"
                                onClick={() => handleDeleteRelationship(nodeData.id, toNode.id, relType)}
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
              ));
            })()}

            <a 
              href={`/leabharlann/relationship/index.html?fromId=${encodeURIComponent(nodeData.id)}`} 
              className="btn btn-primary"
            >
              Create New Relationship
            </a>
          </div>
        </div>
      </div>
    </>
  );
};

export default EditPage;

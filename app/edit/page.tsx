'use client'
import React, { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import Header from '../Header';
import {
  getNode,
  getRelations,
  deleteNode,
  deleteProperty,
  deleteRelation,
  setProperties,
  addLabels,
  deleteLabels
} from '../lib/api';
import { cleanString } from '../lib/util';

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

const EditPage = () => {
  const { isAuthenticated, username, checkAuthStatus } = useAuth();
  const [nodeData, setNodeData] = useState<NodeData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [editingSection, setEditingSection] = useState<'properties' | 'labels' | null>(null);
  const [editedProperties, setEditedProperties] = useState<Record<string, any>>({});
  const [editedLabels, setEditedLabels] = useState<string[]>([]);

  useEffect(() => {
    if (!isAuthenticated) {
      window.location.href = '/';
      return;
    }
    loadNodeData();
  }, [isAuthenticated]);

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
      
      const relRes = await getRelations(id);
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
      const response = await deleteProperty(nodeData.id, key);
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
    if (!confirm(`Are you sure you want to delete this ${relType} relationship?`)) return;
    
    try {
      const response = await deleteRelation(sourceId, targetId, relType);
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
    
    try {
      const response = await setProperties(nodeData.id, editedProperties);
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data?.error?.message || 'Failed to save properties');
      }
      await loadNodeData();
      setEditingSection(null);
      showTimedAlert('Properties updated successfully');
    } catch (err) {
      showTimedAlert(err instanceof Error ? err.message : 'Failed to save properties');
    }
  };

  const handleSaveLabels = async () => {
    if (!nodeData) return;
    
    const currentLabels = nodeData.labels.filter(l => l !== 'Entity');
    const labelsToAdd = editedLabels.filter(l => !currentLabels.includes(l));
    const labelsToRemove = currentLabels.filter(l => !editedLabels.includes(l));
    
    try {
      if (labelsToAdd.length > 0) {
        const addRes = await addLabels(nodeData.id, labelsToAdd);
        if (!addRes.ok) {
          const data = await addRes.json();
          throw new Error(data?.error?.message || 'Failed to add labels');
        }
      }
      
      if (labelsToRemove.length > 0) {
        const delRes = await deleteLabels(nodeData.id, labelsToRemove);
        if (!delRes.ok) {
          const data = await delRes.json();
          throw new Error(data?.error?.message || 'Failed to remove labels');
        }
      }
      
      await loadNodeData();
      setEditingSection(null);
      showTimedAlert('Labels updated successfully');
    } catch (err) {
      showTimedAlert(err instanceof Error ? err.message : 'Failed to save labels');
    }
  };

  if (loading) {
    return (
      <>
        <Header 
          isAuthenticated={isAuthenticated}
          username={username}
          onAuthChange={checkAuthStatus}
        />
        <div className="container mt-4">
          <p>Loading...</p>
        </div>
      </>
    );
  }

  if (error || !nodeData) {
    return (
      <>
        <Header 
          isAuthenticated={isAuthenticated}
          username={username}
          onAuthChange={checkAuthStatus}
        />
        <div className="container mt-4">
          <div className="alert alert-danger">
            {error || 'Node not found'}
          </div>
          <a href="/" className="btn btn-primary">Back to Home</a>
        </div>
      </>
    );
  }

  const title = nodeData.properties.display_name || 
                nodeData.properties.name || 
                nodeData.properties.title || 
                nodeData.nodeId || 
                'Unknown';

  const canEdit = isAuthenticated && (!nodeData.properties.createdBy || nodeData.properties.createdBy === username);

  return (
    <>
      <Header 
        isAuthenticated={isAuthenticated}
        username={username}
        onAuthChange={checkAuthStatus}
      />
      
      <div className="container mt-4">
        {alertMessage && (
          <div className="alert alert-info alert-dismissible fade show" role="alert">
            {alertMessage}
            <button 
              type="button" 
              className="btn-close" 
              onClick={() => setAlertMessage(null)}
            ></button>
          </div>
        )}

        <div id="node-info">
          <div className="d-flex justify-content-between align-items-start mb-4">
            <div>
              <h1 className="mb-2">{title}</h1>
              <p className="text-muted">
                Labels: {nodeData.labels.join(', ')} | Node ID: {nodeData.nodeId || nodeData.id}
              </p>
            </div>
            {canEdit && (
              <button 
                className="btn btn-danger"
                onClick={handleDeleteNode}
              >
                Delete Node
              </button>
            )}
          </div>

          {/* Properties Section */}
          <div className="mb-4">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h3 className="h4">Properties</h3>
              {canEdit && editingSection !== 'properties' && (
                <button 
                  className="btn btn-sm btn-primary"
                  onClick={() => setEditingSection('properties')}
                >
                  Edit Properties
                </button>
              )}
            </div>
            
            {editingSection !== 'properties' ? (
              <table className="table table-striped">
                <thead>
                  <tr>
                    <th scope="col">Name</th>
                    <th scope="col">Value</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(nodeData.properties)
                    .filter(([key]) => key !== 'nodeId')
                    .map(([key, value]) => (
                      <tr key={key}>
                        <td><strong>{cleanString(key)}</strong></td>
                        <td>{Array.isArray(value) ? value.join(', ') : String(value)}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            ) : (
              <div className="mb-4">
                <h3 className="h5 mb-3">Edit Properties</h3>
                <table className="table table-bordered">
                  <thead>
                    <tr>
                      <th scope="col">Name</th>
                      <th scope="col">Value</th>
                      <th scope="col">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(editedProperties)
                      .filter(([key]) => key !== 'nodeId')
                      .map(([key, value]) => (
                        <tr key={key}>
                          <td><strong>{cleanString(key)}</strong></td>
                          <td>
                            <input 
                              type="text" 
                              className="form-control" 
                              value={Array.isArray(value) ? value.join(', ') : String(value)}
                              onChange={(e) => {
                                setEditedProperties({
                                  ...editedProperties,
                                  [key]: e.target.value
                                });
                              }}
                            />
                          </td>
                          <td>
                            <button 
                              className="btn btn-sm btn-danger"
                              onClick={() => handleDeleteProperty(key)}
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
                <button 
                  className="btn btn-secondary me-2"
                  onClick={() => {
                    const newKey = prompt('Enter property name:');
                    if (newKey) {
                      setEditedProperties({
                        ...editedProperties,
                        [newKey]: ''
                      });
                    }
                  }}
                >
                  Add Property
                </button>
                <button className="btn btn-primary me-2" onClick={handleSaveProperties}>
                  Save Changes
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
            )}
          </div>

          {/* Labels Section */}
          <div className="mb-4">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h3 className="h4">Labels</h3>
              {canEdit && editingSection !== 'labels' && (
                <button 
                  className="btn btn-sm btn-primary"
                  onClick={() => setEditingSection('labels')}
                >
                  Edit Labels
                </button>
              )}
            </div>

            {editingSection !== 'labels' ? (
              <div className="labels-display">
                {nodeData.labels.filter(l => l !== 'Entity').map((label, idx) => (
                  <span key={idx} className="badge bg-primary me-2">
                    {label}
                  </span>
                ))}
              </div>
            ) : null}
          </div>

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
            
            {/* Get all unique relationship types */}
            {(() => {
              const allRelTypes = new Map<string, { incoming: Relationship[], outgoing: Relationship[] }>();
              
              // Group incoming relationships by type
              (nodeData.incoming || []).forEach(rel => {
                if (!allRelTypes.has(rel.type)) {
                  allRelTypes.set(rel.type, { incoming: [], outgoing: [] });
                }
                allRelTypes.get(rel.type)!.incoming.push(rel);
              });
              
              // Group outgoing relationships by type
              (nodeData.outgoing || []).forEach(rel => {
                if (!allRelTypes.has(rel.type)) {
                  allRelTypes.set(rel.type, { incoming: [], outgoing: [] });
                }
                allRelTypes.get(rel.type)!.outgoing.push(rel);
              });
              
              return Array.from(allRelTypes.entries()).map(([relType, { incoming, outgoing }]) => (
                <div key={relType} className="rels-section mb-4">
                  <h4 className="h5">{cleanString(relType)}</h4>
                  
                  {/* Incoming relationships */}
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
                              {canEdit && (
                                <button 
                                  className="btn btn-sm btn-danger ms-2"
                                  onClick={() => handleDeleteRelationship(fromNode.id, nodeData.id, relType)}
                                >
                                  Delete
                                </button>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}
                  
                  {/* Outgoing relationships */}
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
                              {canEdit && (
                                <button 
                                  className="btn btn-sm btn-danger ms-2"
                                  onClick={() => handleDeleteRelationship(nodeData.id, toNode.id, relType)}
                                >
                                  Delete
                                </button>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}
                </div>
              ));
            })()}

            {canEdit && (
              <a 
                href={`/leabharlann/relationship/index.html?fromId=${encodeURIComponent(nodeData.id)}`} 
                className="btn btn-primary"
              >
                Create New Relationship
              </a>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default EditPage;
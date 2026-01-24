'use client'
import React, { useState, useEffect } from 'react';
import { Edit2, Save, X, Trash2, ExternalLink, Plus } from 'lucide-react';
import Header from '../Header';

// Utility functions
const cleanString = (str: string): string => {
  return str.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());
};

const isUrl = (str: string): boolean => {
  try {
    new URL(str);
    return true;
  } catch {
    return false;
  }
};

const parseJwt = (token: string): any => {
  try {
    const part = token.split('.')[1];
    return JSON.parse(atob(part));
  } catch {
    return {};
  }
};

// Mock API functions
const getNode = async (id: string): Promise<Response> => {
  const token = localStorage.getItem('token');
  const response = await fetch(`/api/nodes/${id}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return response;
};

const getRelations = async (id: string): Promise<Response> => {
  const token = localStorage.getItem('token');
  const response = await fetch(`/api/nodes/${id}/relationships`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return response;
};

const updateProperty = async (id: string, key: string, value: any): Promise<Response> => {
  const token = localStorage.getItem('token');
  return await fetch(`/api/nodes/${id}/properties/${key}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ value })
  });
};

const deleteProperty = async (id: string, key: string): Promise<Response> => {
  const token = localStorage.getItem('token');
  return await fetch(`/api/nodes/${id}/properties/${key}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  });
};

const deleteNode = async (id: string): Promise<Response> => {
  const token = localStorage.getItem('token');
  return await fetch(`/api/nodes/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  });
};

const deleteRelation = async (sourceId: string, targetId: string, relType: string): Promise<Response> => {
  const token = localStorage.getItem('token');
  return await fetch(`/api/relationships`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ sourceId, targetId, relType })
  });
};

const updateLabels = async (id: string, labels: string[]): Promise<Response> => {
  const token = localStorage.getItem('token');
  return await fetch(`/api/nodes/${id}/labels`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ labels })
  });
};

// Editable field component
const EditableField = ({ 
  value, 
  onSave, 
  multiline = false, 
  canEdit, 
  placeholder = 'Click to edit' 
}: {
  value: string;
  onSave: (value: string) => Promise<void>;
  multiline?: boolean;
  canEdit: boolean;
  placeholder?: string;
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value || '');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setEditValue(value || '');
  }, [value]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(editValue);
      setIsEditing(false);
    } catch (error) {
      console.error('Save failed:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditValue(value || '');
    setIsEditing(false);
  };

  if (!canEdit) {
    return <span>{value || <span className="text-muted">Not set</span>}</span>;
  }

  if (!isEditing) {
    return (
      <div className="editable-field-view" onClick={() => setIsEditing(true)}>
        <span>{value || <span className="text-muted">{placeholder}</span>}</span>
        <Edit2 size={14} className="ms-2 text-primary" style={{ cursor: 'pointer' }} />
      </div>
    );
  }

  return (
    <div className="editable-field-edit">
      {multiline ? (
        <textarea
          className="form-control form-control-sm mb-2"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          rows={4}
          disabled={isSaving}
        />
      ) : (
        <input
          type="text"
          className="form-control form-control-sm mb-2"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          disabled={isSaving}
        />
      )}
      <div className="d-flex gap-2">
        <button
          onClick={handleSave}
          className="btn btn-sm btn-success"
          disabled={isSaving}
        >
          <Save size={14} /> Save
        </button>
        <button
          onClick={handleCancel}
          className="btn btn-sm btn-secondary"
          disabled={isSaving}
        >
          <X size={14} /> Cancel
        </button>
      </div>
    </div>
  );
};

// Relationship display component
const RelationshipSection = ({ 
  title, 
  relationships, 
  currentNodeId, 
  onDelete, 
  canEdit 
}: {
  title: string;
  relationships: any[];
  currentNodeId: string;
  onDelete: (rel: any) => void;
  canEdit: boolean;
}) => {
  if (!relationships || relationships.length === 0) return null;

  return (
    <div className="mb-4">
      <h5 className="border-bottom pb-2 mb-3">{title}</h5>
      <ul className="list-unstyled">
        {relationships.map((rel, idx) => {
          const node = rel.node;
          const label = node.properties.display_name || node.properties.name || 
                       node.properties.title || node.id;
          return (
            <li key={idx} className="mb-2 d-flex align-items-center justify-content-between">
              <a href={`?id=${encodeURIComponent(node.id)}`} className="text-decoration-none">
                {label}
              </a>
              {canEdit && (
                <button
                  onClick={() => onDelete(rel)}
                  className="btn btn-sm btn-outline-danger"
                  title="Delete relationship"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
};

const NodeInfoPage = () => {
  const [nodeData, setNodeData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<{ username: string; role: string } | null>(null);
  const [alertMessage, setAlertMessage] = useState<{ text: string; isError: boolean } | string>('');

  const relationshipCategories: Record<string, string[]> = {
    'Works': ['WROTE'],
    'Author': ['WROTE'],
    'Editions': ['EDITION_OF'],
    'Source Text': ['EDITION_OF'],
    'Translations': ['TRANSLATION_OF'],
    'Publisher': ['PUBLISHED', 'PUBLISHES', 'PUBLISHED_BY'],
    'Published In': ['PUBLISHED_IN'],
    'Commentary': ['COMMENTARY_ON'],
    'Series': ['NEXT_IN_SERIES'],
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      const payload = parseJwt(token);
      setUser({ username: payload.username, role: payload.role });
    }

    const handleAuthChange = () => {
      const newToken = localStorage.getItem('token');
      if (newToken) {
        const payload = parseJwt(newToken);
        setUser({ username: payload.username, role: payload.role });
      } else {
        setUser(null);
      }
    };

    document.addEventListener('authChange', handleAuthChange);
    return () => document.removeEventListener('authChange', handleAuthChange);
  }, []);

  useEffect(() => {
    loadNodeData();
  }, []);

  const loadNodeData = async () => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');

    if (!id) {
      setLoading(false);
      return;
    }

    try {
      const nodeRes = await getNode(id);
      if (nodeRes.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        window.location.href = '/leabharlann/index.html';
        return;
      }
      if (!nodeRes.ok) throw new Error('Failed to load node');

      const data = await nodeRes.json();
      
      const relRes = await getRelations(id);
      if (!relRes.ok) throw new Error('Failed to load relationships');
      
      const relData = await relRes.json();
      data.outgoing = relData.outgoing || [];
      data.incoming = relData.incoming || [];

      setNodeData(data);
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const showAlert = (message: string, isError: boolean = true) => {
    setAlertMessage({ text: message, isError });
    setTimeout(() => setAlertMessage(''), 5000);
  };

  const handlePropertyUpdate = async (key: string, value: string) => {
    try {
      const response = await updateProperty(nodeData.id, key, value);
      if (!response.ok) throw new Error('Failed to update property');
      await loadNodeData();
      showAlert('Property updated successfully', false);
    } catch (err) {
      showAlert(err.message);
      throw err;
    }
  };

  const handlePropertyDelete = async (key: string) => {
    if (!confirm(`Delete property "${cleanString(key)}"?`)) return;
    
    try {
      const response = await deleteProperty(nodeData.id, key);
      if (!response.ok) throw new Error('Failed to delete property');
      await loadNodeData();
      showAlert('Property deleted successfully', false);
    } catch (err) {
      showAlert(err.message);
    }
  };

  const handleLabelsUpdate = async (labelsString: string) => {
    const labels = labelsString.split(',').map(l => l.trim()).filter(Boolean);
    try {
      const response = await updateLabels(nodeData.id, labels);
      if (!response.ok) throw new Error('Failed to update labels');
      await loadNodeData();
      showAlert('Labels updated successfully', false);
    } catch (err) {
      showAlert(err.message);
      throw err;
    }
  };

  const handleDeleteNode = async () => {
    if (!confirm('Are you sure you want to delete this node and all its relationships?')) return;
    
    try {
      const response = await deleteNode(nodeData.id);
      if (!response.ok) throw new Error('Failed to delete node');
      window.location.href = '/leabharlann/index.html';
    } catch (err) {
      showAlert(err.message);
    }
  };

  const handleDeleteRelationship = async (rel: any) => {
    if (!confirm('Delete this relationship?')) return;
    
    try {
      const sourceId = rel.direction === 'incoming' ? rel.node.id : nodeData.id;
      const targetId = rel.direction === 'incoming' ? nodeData.id : rel.node.id;
      const response = await deleteRelation(sourceId, targetId, rel.type);
      if (!response.ok) throw new Error('Failed to delete relationship');
      await loadNodeData();
      showAlert('Relationship deleted successfully', false);
    } catch (err) {
      showAlert(err.message);
    }
  };

  const categorizeRelationships = (incoming: any[], outgoing: any[]) => {
    const categorized: Record<string, any[]> = {};
    const uncategorized: { incoming: any[]; outgoing: any[] } = { incoming: [], outgoing: [] };

    // Process all relationships
    [...incoming.map(r => ({...r, direction: 'incoming'})), 
     ...outgoing.map(r => ({...r, direction: 'outgoing'}))].forEach(rel => {
      let found = false;
      
      for (const [category, types] of Object.entries(relationshipCategories)) {
        if (types.includes(rel.type)) {
          if (!categorized[category]) categorized[category] = [];
          categorized[category].push(rel);
          found = true;
          break;
        }
      }
      
      if (!found) {
        uncategorized[rel.direction].push(rel);
      }
    });

    return { categorized, uncategorized };
  };

  const renderPropertyValue = (value: any) => {
    if (Array.isArray(value)) {
      return value.map((item, idx) => (
        <div key={idx}>
          {isUrl(item) ? (
            <a href={item} target="_blank" rel="noopener noreferrer" className="text-decoration-none">
              {item} <ExternalLink size={12} className="ms-1" />
            </a>
          ) : (
            <span>{item}</span>
          )}
        </div>
      ));
    }
    
    if (typeof value === 'string' && isUrl(value)) {
      return (
        <a href={value} target="_blank" rel="noopener noreferrer" className="text-decoration-none">
          {value} <ExternalLink size={12} className="ms-1" />
        </a>
      );
    }
    
    return value;
  };

  if (loading) {
    return (
      <div className="container mt-5 text-center">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mt-5">
        <div className="alert alert-danger" role="alert">
          <h4 className="alert-heading">Error</h4>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!nodeData) {
    return (
      <div className="container mt-5 text-center">
        <div className="p-5">
          <h2 className="text-muted mb-3">No Node Selected</h2>
          <p className="text-muted">Please select a node to view its details.</p>
        </div>
      </div>
    );
  }

  const title = nodeData.properties.display_name || nodeData.properties.name || 
                nodeData.properties.title || nodeData.id;
  const labels = nodeData.labels.filter(l => l !== 'Entity');
  const canEdit = !!user;
  const isAdmin = user?.role === 'admin';

  const { categorized, uncategorized } = categorizeRelationships(
    nodeData.incoming, 
    nodeData.outgoing
  );

  // Separate properties into sections
  const mainContentProps = ['description', 'contents', 'analysis', 'summary', 'biography'];
  const externalLinks = Object.entries(nodeData.properties)
    .filter(([key, value]) => {
      if (Array.isArray(value)) return value.some(v => isUrl(v));
      return typeof value === 'string' && isUrl(value);
    });

  const infoboxProps = Object.entries(nodeData.properties)
    .filter(([key]) => !mainContentProps.includes(key) && 
                       key !== 'img_link' && 
                       key !== 'nodeId' && 
                       key !== 'createdBy' &&
                       !externalLinks.some(([k]) => k === key));

  return (
    <>
      <Header />
      <div className="container-fluid" style={{ maxWidth: '1400px' }}>
        {alertMessage && (
          <div 
            className={`alert alert-${alertMessage.isError ? 'danger' : 'success'} alert-dismissible fade show mt-3`} 
            role="alert"
          >
            {alertMessage.text}
            <button 
              type="button" 
              className="btn-close" 
              onClick={() => setAlertMessage('')}
            />
          </div>
        )}

      <div className="row mt-4">
        {/* Main content */}
        <div className="col-lg-9">
          {/* Title and labels */}
          <div className="mb-4">
            <h1 className="display-5 mb-2">{title}</h1>
            <div className="d-flex align-items-center gap-2 flex-wrap">
              <EditableField
                value={labels.join(', ')}
                onSave={handleLabelsUpdate}
                canEdit={canEdit}
                placeholder="Add labels"
              />
            </div>
          </div>

          {/* Admin controls */}
          {isAdmin && (
            <div className="mb-4">
              <button onClick={handleDeleteNode} className="btn btn-danger btn-sm">
                <Trash2 size={14} className="me-1" /> Delete Node
              </button>
            </div>
          )}

          {/* Main content sections */}
          {mainContentProps.map(prop => {
            const value = nodeData.properties[prop];
            if (!value && !canEdit) return null;
            
            return (
              <div key={prop} className="mb-4">
                <h3 className="h4 border-bottom pb-2 mb-3">{cleanString(prop)}</h3>
                <div className="content-section">
                  <EditableField
                    value={value}
                    onSave={(v) => handlePropertyUpdate(prop, v)}
                    canEdit={canEdit}
                    multiline
                    placeholder={`Add ${cleanString(prop).toLowerCase()}`}
                  />
                </div>
              </div>
            );
          })}

          {/* External links */}
          {externalLinks.length > 0 && (
            <div className="mb-4">
              <h3 className="h4 border-bottom pb-2 mb-3">External Links</h3>
              <ul className="list-unstyled">
                {externalLinks.map(([key, value]) => {
                  const links = Array.isArray(value) ? value : [value];
                  return links.map((link, idx) => (
                    <li key={`${key}-${idx}`} className="mb-2">
                      <a href={link} target="_blank" rel="noopener noreferrer" className="text-decoration-none">
                        <ExternalLink size={14} className="me-2" />
                        {cleanString(key)}
                      </a>
                    </li>
                  ));
                })}
              </ul>
            </div>
          )}

          {/* Uncategorized relationships */}
          {(uncategorized.incoming.length > 0 || uncategorized.outgoing.length > 0) && (
            <div className="mb-4">
              <h3 className="h4 border-bottom pb-2 mb-3">Other Relationships</h3>
              {uncategorized.incoming.map((rel, idx) => (
                <div key={`in-${idx}`} className="mb-2">
                  <span className="badge bg-secondary me-2">← {rel.type}</span>
                  <a href={`?id=${encodeURIComponent(rel.node.id)}`}>
                    {rel.node.properties.display_name || rel.node.properties.name || rel.node.id}
                  </a>
                  {canEdit && (
                    <button
                      onClick={() => handleDeleteRelationship(rel)}
                      className="btn btn-sm btn-outline-danger ms-2"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              ))}
              {uncategorized.outgoing.map((rel, idx) => (
                <div key={`out-${idx}`} className="mb-2">
                  <span className="badge bg-primary me-2">{rel.type} →</span>
                  <a href={`?id=${encodeURIComponent(rel.node.id)}`}>
                    {rel.node.properties.display_name || rel.node.properties.name || rel.node.id}
                  </a>
                  {canEdit && (
                    <button
                      onClick={() => handleDeleteRelationship(rel)}
                      className="btn btn-sm btn-outline-danger ms-2"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {canEdit && (
            <div className="mt-4">
              <a href={`/leabharlann/relationship/index.html?fromId=${encodeURIComponent(nodeData.id)}`} className="btn btn-primary">
                <Plus size={16} className="me-1" /> Create Relationship
              </a>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="col-lg-3">
          <div className="card sticky-top" style={{ top: '20px' }}>
            <div className="card-body">
              {/* Image */}
              {nodeData.properties.img_link && (
                <div className="mb-3">
                  <img
                    src={Array.isArray(nodeData.properties.img_link) 
                      ? nodeData.properties.img_link[0] 
                      : nodeData.properties.img_link}
                    alt={title}
                    className="img-fluid rounded"
                  />
                </div>
              )}

              {/* Categorized relationships */}
              {Object.entries(categorized).map(([category, rels]) => (
                <RelationshipSection
                  key={category}
                  title={category}
                  relationships={rels}
                  currentNodeId={nodeData.id}
                  onDelete={handleDeleteRelationship}
                  canEdit={canEdit}
                />
              ))}

              {/* Infobox properties */}
              {infoboxProps.length > 0 && (
                <div className="mb-3">
                  <h5 className="border-bottom pb-2 mb-3">Details</h5>
                  <table className="table table-sm table-borderless">
                    <tbody>
                      {infoboxProps.map(([key, value]) => (
                        <tr key={key}>
                          <td className="text-muted small" style={{ width: '40%' }}>
                            {cleanString(key)}
                          </td>
                          <td className="small">
                            <EditableField
                              value={value}
                              onSave={(v) => handlePropertyUpdate(key, v)}
                              canEdit={canEdit}
                              placeholder="Not set"
                            />
                            {canEdit && (
                              <button
                                onClick={() => handlePropertyDelete(key)}
                                className="btn btn-sm btn-link text-danger p-0 ms-2"
                                title="Delete property"
                              >
                                <Trash2 size={12} />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default NodeInfoPage;
'use client'
import React, { useState, useEffect } from 'react';
import isEqual from 'react-fast-compare';
import { useRouter } from 'next/navigation';
import { useAuth } from '../AuthContext';
import Header from '../Header';
import { 
  getNode, 
  getNodeRelationships,
  updateNode,
  deleteNode,
  deleteNodeProperty,
  deleteRelationship,
  updateNodeProperties,
  addNodeLabels,
  deleteNodeLabels
} from '@/lib/api';
import { validateLabel, validatePropertyKey } from '@/lib/utils';
import PropertiesTable from './PropertiesTable';
import LabelsEditor from './LabelsEditor';
import RelationshipsManager from './RelationshipsManager';

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
  fromNode: Node;
  toNode: Node;
}

interface NodeData extends Node {
  outgoing: Relationship[];
  incoming: Relationship[];
}

// Reserved properties that cannot be edited
const RESERVED_PROPERTIES = ['nodeId', 'createdBy'];

const cleanProperties = (
  properties: Record<string, any>
): Record<string, any> => {
  const cleaned: Record<string, any> = {};

  for (const [key, value] of Object.entries(properties)) {
    // Skip reserved properties
    if (RESERVED_PROPERTIES.includes(key)) {
      continue;
    }

    // Validate key
    const validation = validatePropertyKey(key);
    if (!validation.valid) {
      throw new Error(validation.error || 'Invalid property key');
    }

    // Clean value
    if (Array.isArray(value)) {
      const nonEmpty = value.filter(v => String(v).trim() !== '');
      if (nonEmpty.length > 0) {
        cleaned[key] = nonEmpty;
      }
    } else if (String(value).trim() !== '') {
      cleaned[key] = value;
    }
  }

  return cleaned;
};

const EditPage = () => {
  const router = useRouter();
  const { isAuthenticated, username, checkAuthStatus } = useAuth();
  const [nodeData, setNodeData] = useState<NodeData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [editingSection, setEditingSection] = useState<'properties' | 'labels' | null>(null);
  const [editedProperties, setEditedProperties] = useState<Record<string, any>>({});
  const [editedLabels, setEditedLabels] = useState<string[]>([]);
  const [authChecked, setAuthChecked] = useState<boolean>(false);

  // Wait for auth context to initialize before checking authentication
  useEffect(() => {
    const timer = setTimeout(() => {
      setAuthChecked(true);
      if (!isAuthenticated) {
        router.push('/');
      }
    }, 100);
    
    return () => clearTimeout(timer);
  }, [isAuthenticated, router]);

  // Load node data only after auth is checked and user is authenticated
  useEffect(() => {
    if (authChecked && isAuthenticated) {
      loadNodeData();
    }
  }, [authChecked, isAuthenticated]);

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
        router.push('/');
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
      
      // Filter out reserved properties when initializing edited properties
      const editableProps: Record<string, any> = {};
      for (const [key, value] of Object.entries(fullData.properties)) {
        if (!RESERVED_PROPERTIES.includes(key)) {
          editableProps[key] = value;
        }
      }
      
      setNodeData(fullData);
      setEditedProperties(editableProps);
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
      console.log(nodeData);
      const response = await deleteNode(nodeData.nodeId);
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data?.error?.message || 'Failed to delete node');
      }
      router.push('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete node');
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
      setError(err instanceof Error ? err.message : 'Failed to delete property');
    }
  };

  const handleDeleteRelationship = async (fromNodeId: string, toNodeId: string, relType: string) => {
    if (!confirm('Are you sure you want to delete this relationship?')) return;
    
    try {
      const response = await deleteRelationship(fromNodeId, toNodeId, relType);
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data?.error?.message || 'Failed to delete relationship');
      }
      await loadNodeData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete relationship');
    }
  };

  const handleSaveProperties = async () => {
    if (!nodeData) return;
    
    // Clean up properties: remove empty strings from arrays, remove empty properties
    const cleanedProperties = cleanProperties(editedProperties);
    
    try {
      const response = await updateNodeProperties(nodeData.id, cleanedProperties);
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data?.error?.message || 'Failed to update properties');
      }
      setEditingSection(null);
      await loadNodeData();
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update properties');
    }
  };

  const handleSaveLabels = async () => {
    if (!nodeData) return;
    
    // Validate all labels
    for (const label of editedLabels) {
      const validation = validateLabel(label);
      if (!validation.valid) {
        setError(validation.error || 'Invalid label');
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
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update labels');
    }
  };

  const handleSave = async () => {
    if (!nodeData) return;

    // We will save all edited data and submit to the API.
    // If properties or labels have changed, we submit them to POST /api/nodes/[nodeId]
    // in the request body.
    // If a relationship has been deleted, we remove it at
    // DELETE /api/relationships?fromNodeId=${fromNodeId}& ... etc.

    // Check editedProperties against nodeData.properties
    const propChange = !isEqual(editedProperties, cleanProperties(nodeData.properties))

    // Check editedLabels against nodeData.labels
    const labelChange = !isEqual(editedLabels, nodeData.labels);

    // Try to POST to /api/nodes/[nodeId]
    try {
      let data: { labels?: string[]; properties?: Record<string, any> } = {};
      if (labelChange)
        data['labels'] = editedLabels;
      if (propChange)
        data['properties'] = editedProperties;
      
      console.log(nodeData);
      console.log(nodeData.nodeId);

      if (Object.keys(data).length !== 0) // Check that data is not empty.
        await updateNode(nodeData.nodeId, data);
      
      setEditingSection(null);
      await loadNodeData();
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update node data.');
    }
  };

  // Show loading spinner while checking auth
  if (!authChecked) {
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

  // Don't render anything if not authenticated (redirect will happen via useEffect)
  if (!isAuthenticated) {
    return null;
  }

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

  const title = nodeData.properties.display_name || 
                nodeData.properties.name || 
                nodeData.properties.title || 
                String(nodeData.properties.nodeId) || 
                nodeData.nodeId;
  const labels = nodeData.labels?.filter((l: string) => l !== 'Entity') || [];

  return (
    <>
      <Header 
        isAuthenticated={isAuthenticated}
        username={username}
        onAuthChange={checkAuthStatus}
      />
      <div id="edit-page-container" className="container" style={{ maxWidth: '1200px' }}>
        <div className="mt-4">
          {/* Title */}
          <div id="title-container" className="mb-4">
            <h1 className="page-title">Edit: {title}</h1>
            {/* Action Buttons */}
            <div className="mb-4 flex flex-row justify-between align-items-center" id="action-father">
              {/* Navigation & safe actions */}
              <div className="flex gap-2">
                <a 
                  href={`/info?id=${encodeURIComponent(nodeData.nodeId || nodeData.id)}`} 
                  className="btn btn-secondary">
                  Back to Info View
                </a>
                <button className="btn btn-outline-secondary" onClick={loadNodeData}>
                  Reload from Database
                </button>
                <button className="btn btn-primary" onClick={handleSave}>
                  Save All Changes
                </button>
              </div>

              {/* Destructive action */}
              <button className="btn btn-danger" onClick={handleDeleteNode}>
                Delete Node
              </button>
            </div>
          </div>

          {/* Edit Labels Form */}
          <LabelsEditor
            labels={editedLabels}
            onLabelsChange={setEditedLabels}/>

          {/* Edit Properties Form */}
          <PropertiesTable
            properties={editedProperties}
            onPropertiesChange={setEditedProperties}/>

          {/* Relationships Section */}
          <RelationshipsManager
            nodeId={nodeData.id}
            nodeTitle={title}
            incoming={nodeData.incoming || []}
            outgoing={nodeData.outgoing || []}
            onDeleteRelationship={handleDeleteRelationship}
          />
        </div>
      </div>
    </>
  );
};

export default EditPage;
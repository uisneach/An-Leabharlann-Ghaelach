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
  createRelationship,
  deleteRelationship,
  updateNodeProperties,
  addNodeLabels,
  deleteNodeLabels
} from '@/lib/api';
import { validateLabel, validatePropertyKey, getNodeDisplayName, isSameRel } from '@/lib/utils';
import { Node, Relationship, NodeData } from '@/lib/types';
import PropertiesTable from './PropertiesTable';
import LabelsEditor from './LabelsEditor';
import RelationshipsManager from './RelationshipsManager';

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
  const [editedRels, setEditedRels] = useState<Relationship[]>([]);
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
      setEditedRels([...fullData.incoming, ...fullData.outgoing]);
      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setLoading(false);
    }
  };

  const handleDeleteNode = async () => {
    if (!nodeData || !confirm('Are you sure you want to delete this node and all its relationships?')) return;
    
    try {
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

  const handleSave = async () => {
    if (!nodeData) return;

    // We will save all edited data and submit to the API.
    // If properties or labels have changed, we submit them to POST /api/nodes/[nodeId]
    // in the request body.
    // If a relationship has been deleted, we remove it at
    // DELETE /api/relationships?fromNodeId=${fromNodeId}& ... etc.
    // If new relationships have been added, we add them at PUT /api/relationships.

    // Check editedProperties against nodeData.properties
    const propChange = !isEqual(editedProperties, cleanProperties(nodeData.properties))

    // Check editedLabels against nodeData.labels
    const labelChange = !isEqual(editedLabels, nodeData.labels);

    // Try PUT to /api/nodes/[nodeId]. This will update props and labels.
    try {
      let data: { labels?: string[]; properties?: Record<string, any> } = {};
      if (labelChange)
        data['labels'] = editedLabels;
      if (propChange)
        data['properties'] = editedProperties;
      
      if (Object.keys(data).length !== 0) // Check that data is not empty.
        await updateNode(nodeData.nodeId, data);
      
      setEditingSection(null);
      await loadNodeData();
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update node data.');
      return;
    }

    // If PUT was success, go through relationships and either CREATE, DELETE, or DO NOTHING.

    // Compute staged relationships by finding new rels in editedRels that are not also in the old rel list.
    const stagedRels = editedRels.filter((rel) => ![...nodeData.incoming, ...nodeData.outgoing].some((existingRel) => isSameRel(existingRel, rel)));
    try {
      for (const rel of stagedRels) {
        await createRelationship(rel.fromNode.nodeId, rel.toNode.nodeId, rel.type);
      }
      setEditingSection(null);
      await loadNodeData();
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create relationship(s).');
      return;
    }

    // Compute all rels which are in the existing NodeData, and NOT in the new editedRels.
    // Those rels are ones marked for deletion.
    const relsToDelete = [...nodeData.incoming, ...nodeData.outgoing].filter((rel) => !editedRels.some((newRel) => isSameRel(rel, newRel)));
    try {
      for (const rel of relsToDelete) {
        await deleteRelationship(rel.fromNode.nodeId, rel.toNode.nodeId, rel.type);
      }
      setEditingSection(null);
      await loadNodeData();
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create relationship(s).');
      return;
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

  const title = getNodeDisplayName(nodeData);
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
            <h3 className="page-subtitle">{labels.join(', ')}</h3>
          </div>

          {/* Action Buttons */}
          <div className="mb-4 flex flex-row justify-between align-items-center" id="action-father">
            {/* Navigation & safe actions */}
            <div className="d-flex gap-2">
              <a 
                href={`/info?id=${encodeURIComponent(nodeData.nodeId)}`} 
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

          <hr />

          {/* Edit Labels Form */}
          <LabelsEditor
            labels={editedLabels}
            onLabelsChange={setEditedLabels}/>

          <hr />

          {/* Edit Properties Form */}
          <PropertiesTable
            properties={editedProperties}
            onPropertiesChange={setEditedProperties}/>

          <hr />

          {/* Relationships Section */}
          <RelationshipsManager
            nodeData={nodeData}
            onEditRelationships={setEditedRels}
          />
        </div>
      </div>
    </>
  );
};

export default EditPage;

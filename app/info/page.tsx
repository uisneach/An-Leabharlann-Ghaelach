'use client'
import React, { useState, useEffect } from 'react';
import { ExternalLink } from 'lucide-react';
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

// API functions
const getNode = async (id: string): Promise<Response> => {
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || '/api';
  return await fetch(`${apiBaseUrl}/nodes/${id}`);
};

const getRelations = async (id: string): Promise<Response> => {
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || '/api';
  return await fetch(`${apiBaseUrl}/nodes/${id}/relationships`);
};

interface Node {
  nodeId: string;
  labels: string[];
  properties: {
    display_name?: string;
    title?: string;
    name?: string;
    nodeId?: string | number;
    img_link?: string | string[];
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

// Special relationships configuration
const specialRels = {
  incoming: {
    'EDITION_OF': 'Editions',
    'VERSION_OF': 'Versions',
    'DERIVED_FROM': 'Main Text',
    'TRANSLATION_OF': 'Translations',
    'TRANSLATED': 'Translators',
    'PUBLISHED': 'Publisher',
    'PUBLISHES': 'Publisher',
    'WROTE': 'Author',
    'DISPLAYS': 'Displayed On',
    'PUBLISHED_IN': 'Published',
    'HOSTS': 'Hosted By',
    'COMMENTARY_ON': 'Commentary',
    'NEXT_IN_SERIES': 'Previous in Series',
    'ISSUE_OF': 'Issues',
    'EDITED': 'Editor'
  },
  outgoing: {
    'PUBLISHED_BY': 'Publishers',
    'PUBLISHED': 'Published',
    'PUBLISHES': 'Publishes',
    'EDITION_OF': 'Source Text',
    'VERSION_OF': 'A Version Of',
    'DERIVED_FROM': 'Derived From',
    'WROTE': 'Works',
    'PUBLISHED_IN': 'Published In',
    'TRANSLATED': 'Translated',
    'DISPLAYS': 'Displays',
    'HOSTS': 'Hosts',
    'COMMENTARY_ON': 'Commentary On',
    'NEXT_IN_SERIES': 'Next in Series',
    'ISSUE_OF': 'Parent Journal',
    'EDITED': 'Editions'
  }
};

const NodeInfoPage = () => {
  const [nodeData, setNodeData] = useState<NodeData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    setIsAuthenticated(!!localStorage.getItem('token'));
  }, []);

  useEffect(() => {
    const handleAuthChange = () => setIsAuthenticated(!!localStorage.getItem('token'));
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
      
      if (nodeRes.status === 403) {
        setError('Access denied: This node cannot be accessed');
        setLoading(false);
        return;
      }
      
      if (!nodeRes.ok) {
        const errorData = await nodeRes.json();
        throw new Error(errorData.error || 'Failed to load node');
      }

      const nodeResponseData = await nodeRes.json();
      
      const node: Node = {
        nodeId: nodeResponseData.nodeId,
        labels: nodeResponseData.labels || [],
        properties: nodeResponseData.properties || {}
      };
      
      const relRes = await getRelations(id);
      if (!relRes.ok) throw new Error('Failed to load relationships');
      
      const relData = await relRes.json();
      
      const fullData: NodeData = {
        ...node,
        outgoing: relData.outgoing || [],
        incoming: relData.incoming || []
      };
      
      setNodeData(fullData);
      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setLoading(false);
    }
  };

  const categorizeRelationships = (incoming: Relationship[], outgoing: Relationship[]) => {
    const categorized: Record<string, (Relationship & { direction: 'incoming' | 'outgoing' })[]> = {};
    const uncategorized: { incoming: Relationship[], outgoing: Relationship[] } = { incoming: [], outgoing: [] };

    incoming.forEach(rel => {
      const header = specialRels.incoming[rel.type as keyof typeof specialRels.incoming];
      if (header) {
        if (!categorized[header]) categorized[header] = [];
        categorized[header].push({ ...rel, direction: 'incoming' });
      } else {
        uncategorized.incoming.push(rel);
      }
    });

    outgoing.forEach(rel => {
      const header = specialRels.outgoing[rel.type as keyof typeof specialRels.outgoing];
      if (header) {
        if (!categorized[header]) categorized[header] = [];
        categorized[header].push({ ...rel, direction: 'outgoing' });
      } else {
        uncategorized.outgoing.push(rel);
      }
    });

    return { categorized, uncategorized };
  };

  const renderPropertyValue = (value: any) => {
    if (Array.isArray(value)) {
      return value.map((item: any, idx: number) => (
        <div key={idx}>
          {isUrl(String(item)) ? (
            <a href={String(item)} target="_blank" rel="noopener noreferrer" className="text-decoration-none">
              {String(item)} <ExternalLink size={12} className="ms-1" />
            </a>
          ) : (
            <span>{String(item)}</span>
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
    
    return String(value);
  };

  if (loading) {
    return (
      <>
        <Header />
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
        <Header />
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
        <Header />
        <div className="container mt-5 text-center">
          <div className="p-5">
            <h2 className="text-muted mb-3">No Node Selected</h2>
            <p className="text-muted">Please select a node to view its details.</p>
          </div>
        </div>
      </>
    );
  }

  const title = nodeData.properties.display_name || nodeData.properties.name || nodeData.properties.title || String(nodeData.properties.nodeId) || nodeData.nodeId;
  const labels = nodeData.labels?.filter((l: string) => l !== 'Entity') || [];

  console.log(nodeData);
  const { categorized, uncategorized } = categorizeRelationships(
    nodeData.incoming || [], 
    nodeData.outgoing || []
  );

  // Separate properties into sections
  const mainContentProps = ['description', 'contents', 'analysis', 'summary', 'biography', 'works'];
  
  // Get all properties except special ones
  const allProps = Object.entries(nodeData.properties).filter(([key]) => 
    key !== 'nodeId' && key !== 'createdBy'
  );
  
  const externalLinks = allProps.filter(([_, value]) => {
    if (Array.isArray(value)) return value.some(v => isUrl(String(v)));
    return typeof value === 'string' && isUrl(value);
  });

  const infoboxProps = allProps.filter(([key]) => 
    !mainContentProps.includes(key) && 
    key !== 'img_link' && 
    key !== 'display_name' &&
    key !== 'name' &&
    key !== 'title' &&
    !externalLinks.some(([k]) => k === key)
  );

  return (
    <>
      <Header />
      <div id="content" className="container-fluid" style={{ maxWidth: '1400px', width: "90%" }}>
        {/* Title and labels */}
        <div id="title-container" className="mb-4">
            <h1 className="page-title">{title}</h1>
            <h3 className="page-subtitle">{labels.join(', ')}</h3>
        </div>
        <div className="mt-4 flex flex-row gap-4">
          {/* Main content */}
          <div className="col-lg-8 flex-1 basis-3/4 min-w-0">
            {/* Edit button for authenticated users */}
            {isAuthenticated && (
              <div className="mb-3">
                <a 
                  href={`/edit?id=${encodeURIComponent(nodeData.nodeId)}`}
                  className="btn btn-primary me-2"
                >
                  Edit Node
                </a>
                <a 
                  href={`/leabharlann/relationship/index.html?fromId=${encodeURIComponent(nodeData.nodeId)}`}
                  className="btn btn-primary"
                >
                  Create Relationship
                </a>
              </div>
            )}

            {/* Main content sections */}
            <div id="propertiesDisplay">
              {mainContentProps.map(prop => {
                const value = nodeData.properties[prop];
                if (!value) return null;
                
                return (
                  <div key={prop} className="mb-4">
                    <h3 className="section-header">{cleanString(prop)}</h3>
                    <div className="content-section">
                      <p>{String(value)}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* External links */}
            {externalLinks.length > 0 && (
              <div className="mb-4">
                <h3 className="section-header">External Links</h3>
                <ul className="list-unstyled">
                  {externalLinks.map(([key, value]) => {
                    const links = Array.isArray(value) ? value : [value];
                    return links.map((link: any, idx: number) => (
                      <li key={`${key}-${idx}`} className="mb-2">
                        <a href={String(link)} target="_blank" rel="noopener noreferrer" className="text-decoration-none flex flex-row">
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
              <div className="rels-section mb-4">
                <h3 className="section-header">Other Relationships</h3>
                {uncategorized.incoming.map((rel, idx) => (
                  <div key={`in-${idx}`} className="mb-2">
                    <span className="badge bg-secondary me-2">← {rel.type}</span>
                    <a href={`?id=${encodeURIComponent(rel.node.nodeId)}`}>
                      {rel.node.properties.display_name || rel.node.properties.name || rel.node.nodeId}
                    </a>
                  </div>
                ))}
                {uncategorized.outgoing.map((rel, idx) => (
                  <div key={`out-${idx}`} className="mb-2">
                    <span className="badge bg-primary me-2">{rel.type} →</span>
                    <a href={`?id=${encodeURIComponent(rel.node.nodeId)}`}>
                      {rel.node.properties.display_name || rel.node.properties.name || rel.node.nodeId}
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <aside className="col-lg-4 flex-0 basis-1/4 min-w-0 max-w-sm">
            <div className="card sticky-top infobox" style={{ top: '20px' }}>
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
                      style={{ width: '100%', maxHeight: '60vh', objectFit: 'contain' }}
                    />
                  </div>
                )}

                {/* Categorized relationships */}
                {Object.entries(categorized).map(([category, rels]) => (
                  <div key={category} className="rels-section mb-4">
                    <h3 className="section-header">{category}</h3>
                    <ul className="rels-list">
                      {rels.map((rel, idx) => {
                        const node = rel.node;
                        const label = node.properties.display_name || node.properties.name || node.properties.title || node.nodeId;
                        return (
                          <li key={idx} className="mb-2">
                            <a href={`?id=${encodeURIComponent(node.nodeId)}`} className="text-decoration-none">
                              {label}
                            </a>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}

                {/* Infobox properties */}
                {infoboxProps.length > 0 && (
                  <div className="mb-3">
                    <h4 className="section-header">Details</h4>
                    <table className="table table-sm table-borderless" id="info-table">
                      <tbody>
                        {infoboxProps.map(([key, value]) => (
                          <tr key={key}>
                            <th className="text-muted small" style={{ width: '40%' }}>
                              {cleanString(key)}
                            </th>
                            <td className="small">
                              {renderPropertyValue(value)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </>
  );
};

export default NodeInfoPage;
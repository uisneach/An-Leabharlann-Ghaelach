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
  return await fetch(`/api/nodes/${id}`);
};

const getRelations = async (id: string): Promise<Response> => {
  return await fetch(`/api/nodes/${id}/relationships`);
};

interface Node {
  id: string;
  properties: Record<string, any>;
  labels: string[];
  incoming: Relationship[];
  outgoing: Relationship[];
}

interface Relationship {
  type: string;
  node: {
    id: string;
    properties: Record<string, any>;
  };
}

// Relationship display component
const RelationshipSection = ({ 
  title, 
  relationships, 
  currentNodeId 
}: {
  title: string;
  relationships: (Relationship & { direction: 'incoming' | 'outgoing' })[];
  currentNodeId: string;
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
            <li key={idx} className="mb-2">
              <a href={`?id=${encodeURIComponent(node.id)}`} className="text-decoration-none">
                {label}
              </a>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

const NodeInfoPage = () => {
  const [nodeData, setNodeData] = useState<Node | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

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
      setError(err instanceof Error ? err.message : 'An error occurred');
      setLoading(false);
    }
  };

  const categorizeRelationships = (incoming: Relationship[], outgoing: Relationship[]) => {
    const categorized: Record<string, (Relationship & { direction: 'incoming' | 'outgoing' })[]> = {};
    const uncategorized: { incoming: (Relationship & { direction: 'incoming' })[]; outgoing: (Relationship & { direction: 'outgoing' })[] } = { incoming: [], outgoing: [] };

    // Process all relationships
    [...incoming.map(r => ({...r, direction: 'incoming' as const})), 
     ...outgoing.map(r => ({...r, direction: 'outgoing' as const}))].forEach(rel => {
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
        if (rel.direction === 'incoming') {
          uncategorized.incoming.push(rel);
        } else {
          uncategorized.outgoing.push(rel);
        }
      }
    });

    return { categorized, uncategorized };
  };

  const renderPropertyValue = (value: any) => {
    if (Array.isArray(value)) {
      return value.map((item: any, idx: number) => (
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
        <div className="row mt-4">
          {/* Main content */}
          <div className="col-lg-9">
            {/* Title and labels */}
            <div className="mb-4">
              <h1 className="display-5 mb-2">{title}</h1>
              <div className="d-flex align-items-center gap-2 flex-wrap">
                <span>{labels.join(', ')}</span>
              </div>
            </div>

            {/* Main content sections */}
            {mainContentProps.map(prop => {
              const value = nodeData.properties[prop];
              if (!value) return null;
              
              return (
                <div key={prop} className="mb-4">
                  <h3 className="h4 border-bottom pb-2 mb-3">{cleanString(prop)}</h3>
                  <div className="content-section">
                    <span>{value}</span>
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
                    return links.map((link: any, idx: number) => (
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
                  </div>
                ))}
                {uncategorized.outgoing.map((rel, idx) => (
                  <div key={`out-${idx}`} className="mb-2">
                    <span className="badge bg-primary me-2">{rel.type} →</span>
                    <a href={`?id=${encodeURIComponent(rel.node.id)}`}>
                      {rel.node.properties.display_name || rel.node.properties.name || rel.node.id}
                    </a>
                  </div>
                ))}
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
          </div>
        </div>
      </div>
    </>
  );
};

export default NodeInfoPage;
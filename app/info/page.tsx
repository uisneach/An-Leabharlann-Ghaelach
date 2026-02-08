'use client'
import React, { useState, useEffect } from 'react';
import { ExternalLink } from 'lucide-react';
import { useAuth } from '@/app/AuthContext';
import Header from '@/app/Header';
import Footer from '@/app/Footer';
import { getNode, getNodeRelationships } from '@/lib/api';
import { 
  cleanString, 
  isUrl, 
  categorizeRelationships,
  getNodeTitle
} from '@/lib/utils';
import { getExternalLinkText } from '@/lib/domainNames';
import { Node, Relationship } from '@/lib/types';

interface NodeData extends Node {
  outgoing: Relationship[];
  incoming: Relationship[];
}

const NodeInfoPage = () => {
  const { isAuthenticated, username, checkAuthStatus } = useAuth();
  const [nodeData, setNodeData] = useState<NodeData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

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
      
      const relRes = await getNodeRelationships(id);
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
            <p className="text-muted">Please select a node to view its details.</p>
          </div>
        </div>
      </>
    );
  }

  const title = getNodeTitle(nodeData);
  const labels = nodeData.labels?.filter((l: string) => l !== 'Entity') || [];

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
      <Header 
        isAuthenticated={isAuthenticated}
        username={username}
        onAuthChange={checkAuthStatus}
      />
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

            {/* Categorized relationships */}
            {Object.entries(categorized).map(([category, rels]) => (
              <div key={category} className="rels-section mb-4">
                <h3 className="section-header">{category}</h3>
                <ul className="rels-list">
                  {rels.map((rel, idx) => {
                    // For categorized relationships, we need to determine which node to display
                    // If this is an incoming relationship, show the fromNode
                    // If this is an outgoing relationship, show the toNode
                    const displayNode = rel.direction === 'incoming' ? rel.fromNode : rel.toNode;
                    const label = getNodeTitle(displayNode);
                    
                    return (
                      <li key={idx} className="mb-2">
                        <a href={`?id=${encodeURIComponent(displayNode.nodeId)}`} className="text-decoration-none">
                          {label}
                        </a>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}

            {/* Uncategorized relationships */}
            {(uncategorized.incoming.length > 0 || uncategorized.outgoing.length > 0) && (
              <div className="rels-section mb-4">
                <h3 className="section-header">Other Relationships</h3>
                {uncategorized.incoming.map((rel, idx) => (
                  <div key={`in-${idx}`} className="mb-2">
                    <span className="badge bg-secondary me-2">← {rel.type}</span>
                    <a href={`?id=${encodeURIComponent(rel.fromNode.nodeId)}`}>
                      {getNodeTitle(rel.fromNode)}
                    </a>
                  </div>
                ))}
                {uncategorized.outgoing.map((rel, idx) => (
                  <div key={`out-${idx}`} className="mb-2">
                    <span className="badge bg-primary me-2">{rel.type} →</span>
                    <a href={`?id=${encodeURIComponent(rel.toNode.nodeId)}`}>
                      {getNodeTitle(rel.toNode)}
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

                {/* External links */}
                {externalLinks.length > 0 && (
                  <div className="mb-4">
                    <h3 className="section-header">External Links</h3>
                    <ul className="list-unstyled">
                      {externalLinks.map(([key, value]) => {
                        const links = Array.isArray(value) ? value : [value];
                        return links.map((link: any, idx: number) => {
                          const linkText = getExternalLinkText(String(link), key);
                          return (
                            <li key={`${key}-${idx}`} className="mb-2">
                              <a href={String(link)} target="_blank" rel="noopener noreferrer" className="text-decoration-none flex flex-row">
                                <ExternalLink size={14} className="me-2" />
                                {linkText}
                              </a>
                            </li>
                          );
                        });
                      })}
                    </ul>
                  </div>
                )}

              </div>
            </div>
          </aside>
        </div>
      </div>
      <Footer />
    </>
  );
};

export default NodeInfoPage;
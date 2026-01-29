'use client';
import React, { useState, useEffect } from 'react';

const defaultLabels = ['Author', 'Text', 'Edition'];

interface Node {
  nodeId: string;
  properties: {
    title?: string;
    name?: string;
    display_name?: string;
    nodeId?: string | number;
    [key: string]: any;
  };
  [key: string]: any;
}

interface NodeListProps {
  label: string;
  onRemove: () => void;
  isDefault: boolean;
  totalColumns: number;
}

export default function NodeList({ label, onRemove, isDefault, totalColumns }: NodeListProps) {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [loading, setLoading] = useState(true);
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
    async function fetchNodes() {
      setLoading(true);
      setError(null);
      try {
        const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || '/api';
        const res = await fetch(`${apiBaseUrl}/util?action=nodes&label=${encodeURIComponent(label)}&limit=0`);
        if (!res.ok) {
          throw new Error(`Failed to load ${label} nodes: ${res.status} ${res.statusText}`);
        }
        const data = await res.json();
        setNodes(data.nodes || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
      } finally {
        setLoading(false);
      }
    }
    fetchNodes();
  }, [label]);

  const getTitle = (item: Node) => {
    // Ensure we convert to string before calling trim()
    const title = item.properties.display_name || 
                  item.properties.name || 
                  item.properties.title || 
                  item.properties.nodeId || 
                  '';
    return String(title).trim().toLowerCase();
  };

  const sortedNodes = [...nodes].sort((a, b) => 
    getTitle(a).localeCompare(getTitle(b), undefined, { sensitivity: 'base', numeric: false })
  );

  if (loading) {
    return (
      <div className="col-md-4">
        <h2 className="section-title">{label}s</h2>
        <div>Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="col-md-4">
        <h2 className="section-title">{label}s</h2>
        <div className="text-danger">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="col-md-4" id={`col-${label}`}>
      <div className="d-flex justify-content-between align-items-center">
        <h2 className="section-title">
          {label}s <a href={`/label/?label=${label}`} className="ms-2 text-decoration-none" style={{ fontSize: '16px' }}>See All→</a>
        </h2>
        <div>
          {isAuthenticated && (
            <a href={`/leabharlann/create/index.html?label=${encodeURIComponent(label)}`} className="btn btn-sm btn-primary create-btn">+</a>
          )}
          <button 
            className="btn btn-sm btn-danger remove-btn ms-2" 
            onClick={onRemove} 
            style={{ display: isDefault && totalColumns <= 3 ? 'none' : 'inline-block' }}
          >
            Remove
          </button>
        </div>
      </div>
      <ul id={`${label}-list`} className="node-list">
        {sortedNodes.map((item) => {
          console.log(item);
          const title = item.properties.display_name || 
                       item.properties.name || 
                       item.properties.title || 
                       String(item.properties.nodeId || item.nodeId || 'Unknown');
          const nodeId = item.properties.nodeId || -1;
          return (
            <li key={nodeId}>
              <a href={`/info?id=${encodeURIComponent(nodeId)}`}>{title}</a>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
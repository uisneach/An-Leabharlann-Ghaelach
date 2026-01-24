'use client';
import React, { useState, useEffect } from 'react';

const defaultLabels = ['Author', 'Text', 'Edition'];

interface Node {
  id: string;
  properties: Record<string, any>;
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

  // Initialize auth state after mount (client-side only)
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
        const res = await fetch(`/api/nodes/get?label=${encodeURIComponent(label)}&limit=0`);
        if (!res.ok) {
          throw new Error(`Failed to load ${label} nodes: ${res.status} ${res.statusText}`);
        }
        const data = await res.json();
        setNodes(data.nodes || []); // Assuming API returns { nodes: [...] }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
      } finally {
        setLoading(false);
      }
    }
    fetchNodes();
  }, [label]);

  const getTitle = (item: Node) => {
    const properties = item.properties || {};
    return (properties.display_name || properties.name || properties.title || item.id || '').trim().toLowerCase();
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
          {label}s <a href={`/leabharlann/label/index.html?label=${label}`} className="ms-2 text-decoration-none" style={{ fontSize: '16px' }}>See All→</a>
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
          const properties = item.properties || {};
          const title = properties.display_name || properties.name || properties.title || item.id || 'Unknown';
          return (
            <li key={item.id}>
              <a href={`/leabharlann/info/index.html?id=${encodeURIComponent(item.id)}`}>{title}</a>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
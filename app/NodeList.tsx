'use client';
import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { getNodesByLabel } from '@/lib/api';
import { getNodeTitle, getNodeSortKey, sortNodes } from '@/lib/utils';

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
  isAuthenticated: boolean;
}

export default function NodeList({ label, onRemove, isDefault, totalColumns, isAuthenticated }: NodeListProps) {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    async function fetchNodes() {
      setLoading(true);
      setError(null);
      try {
        const res = await getNodesByLabel(label, 0);
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

  const sortedNodes = sortNodes(nodes);

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
      <div id="node-list-label-container">
        <h2 className="section-title">
          {label}s <a href={`/label/?label=${label}`} className="ms-2 text-decoration-none" style={{ fontSize: '16px' }}>See All→</a>
        </h2>
        <div>
          {isAuthenticated && (
            <a href={`/create?label=${encodeURIComponent(label)}`} className="btn btn-sm btn-primary create-btn">+</a>
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
          const title = getNodeTitle(item);
          const nodeId = item.properties.nodeId || item.nodeId || -1;
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

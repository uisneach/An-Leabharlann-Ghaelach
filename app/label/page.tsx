'use client'

import { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import Header from '../Header';
import { getNodesByLabel } from '@/lib/api';
import { sortNodes, getNodeTitle } from '@/lib/utils';

// Type definitions
interface NodeProperties {
  name?: string;
  title?: string;
  display_name?: string;
  [key: string]: any;
}

interface Node {
  id: string;
  labels: string[];
  properties: NodeProperties;
}

interface NodesApiResponse {
  success: boolean;
  label: string;
  nodes: Node[];
  count: number;
  limit: number | null;
}

// Main Nodes Page Component
const NodesPage = () => {
  const { isAuthenticated, username, checkAuthStatus } = useAuth();
  const [nodes, setNodes] = useState<Node[]>([]);
  const [label, setLabel] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    loadNodesFromURL();
  }, []);

  const loadNodesFromURL = async () => {
    const params = new URLSearchParams(window.location.search);
    const labelParam = params.get('label');
    
    if (!labelParam) {
      setError('Missing label parameter');
      setLoading(false);
      return;
    }

    setLabel(labelParam);
    await loadNodes(labelParam);
  };

  const loadNodes = async (label: string) => {
    try {
      setLoading(true);
      const response = await getNodesByLabel(label, 0); // 0 = no limit
      if (!response.ok) throw new Error('Failed to load nodes');
      
      const data: NodesApiResponse = await response.json();
      
      // Handle the new API response format
      let nodesData = data.nodes || [];
      
      // Sort nodes alphabetically
      nodesData = sortNodes(nodesData);
      
      setNodes(nodesData);
      setError('');
    } catch (error) {
      console.error('Load nodes error:', error);
      setError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Header 
        isAuthenticated={isAuthenticated}
        username={username}
        onAuthChange={checkAuthStatus}
      />
      
      <div className="container mt-4" id="label-list-container">
        <h2 id="page-title">
          {loading ? 'Loading Nodes...' : error ? 'Error' : `All ${label}s`}
        </h2>
        
        {error && <p className="text-danger">Error: {error}</p>}
        
        {!loading && !error && (
          <ul className="list-group" style={{ marginBottom: '2rem' }}>
            {nodes.map((node, index) => (
              <li key={index} className="list-group-item">
                <a href={`/info?nodeId=${encodeURIComponent(node.id)}`}>
                  {getNodeTitle(node)}
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default NodesPage;

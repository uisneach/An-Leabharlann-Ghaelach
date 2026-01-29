'use client'

import { useState, useEffect } from 'react';
import Header from '../Header';

// API utility functions
const getNodesByLabel = async (label) => {
  const token = localStorage.getItem('token');
  const headers = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return fetch(process.env.NEXT_PUBLIC_API_BASE_URL + `/util?action=nodes&label=${encodeURIComponent(label)}`, { headers });
};

// Main Nodes Page Component
const NodesPage = () => {
  const [nodes, setNodes] = useState([]);
  const [label, setLabel] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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

  const loadNodes = async (label) => {
    try {
      setLoading(true);
      const response = await getNodesByLabel(label);
      if (!response.ok) throw new Error('Failed to load nodes');
      
      const data = await response.json();
      
      // Handle the new API response format
      let nodesData = data.nodes || [];
      
      nodesData.sort((a, b) => {
        const nameA = a.properties.name || a.properties.title || a.id;
        const nameB = b.properties.name || b.properties.title || b.id;
        return nameA.localeCompare(nameB);
      });
      
      setNodes(nodesData);
      setError('');
    } catch (error) {
      console.error('Load nodes error:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Header />
      
      <div className="container mt-4">
        <h2 id="page-title">
          {loading ? 'Loading Nodes...' : error ? 'Error' : `All ${label}s`}
        </h2>
        
        {error && <p className="text-danger">Error: {error}</p>}
        
        {!loading && !error && (
          <ul className="list-group" style={{ marginBottom: '2rem' }}>
            {nodes.map((node, index) => (
              <li key={index} className="list-group-item">
                <a href={`/leabharlann/info/index.html?label=${encodeURIComponent(label)}&id=${encodeURIComponent(node.id)}`}>
                  {node.properties.display_name || node.properties.name || node.properties.title || node.id}
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
'use client'

import { useState, FormEvent, ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import Header from '../Header';

// Type definitions
interface Property {
  name: string;
  value: string;
}

interface CreateNodeResponse {
  success: boolean;
  node: {
    id: string;
    labels: string[];
    properties: Record<string, any>;
  };
  message: string;
}

interface SearchResult {
  id: string;
  labels: string[];
  properties: {
    name?: string;
    title?: string;
    display_name?: string;
    [key: string]: any;
  };
}

// API utility functions
const createNode = async (labels: string[], properties: Record<string, any>) => {
  const token = localStorage.getItem('token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return fetch(process.env.NEXT_PUBLIC_API_BASE_URL + '/nodes/create', {
    method: 'POST',
    headers,
    body: JSON.stringify({ labels, properties })
  });
};

const searchWithLabel = async (query: string, label: string) => {
  const token = localStorage.getItem('token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return fetch(
    process.env.NEXT_PUBLIC_API_BASE_URL + `/util?action=search&q=${encodeURIComponent(query)}&label=${encodeURIComponent(label)}`,
    { headers }
  );
};

// Main Create Node Page Component
const CreateNodePage = () => {
  const router = useRouter();
  const [nodeLabels, setNodeLabels] = useState<string>('');
  const [properties, setProperties] = useState<Property[]>([{ name: '', value: '' }]);
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  // Load label from URL params on mount
  useState(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const label = params.get('label');
      if (label) {
        setNodeLabels(label);
      }
    }
  });

  const handleAddProperty = () => {
    setProperties([...properties, { name: '', value: '' }]);
  };

  const handlePropertyChange = (index: number, field: 'name' | 'value', value: string) => {
    const newProperties = [...properties];
    newProperties[index][field] = value;
    setProperties(newProperties);
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');

    // Validate and collect labels
    const labelsInput = nodeLabels.trim();
    const labels = labelsInput.split(',').map(label => label.trim()).filter(label => label);
    
    if (!labels.length) {
      setError('At least one label is required');
      return;
    }
    
    if (labels.some(label => !/^[A-Za-z_][A-Za-z0-9_]*$/.test(label))) {
      setError('Labels must contain only letters, numbers, or underscores');
      return;
    }

    // Collect properties (optional)
    const propsObject: Record<string, any> = {};
    let invalidProp = false;
    
    properties.forEach(prop => {
      const name = prop.name.trim();
      const value = prop.value.trim();
      
      if (name) {
        if (/[^a-zA-Z0-9_]/.test(name)) {
          invalidProp = true;
          return;
        }
        propsObject[name] = value || null;
      }
    });
    
    if (invalidProp) {
      setError('Property names must contain only letters, numbers, or underscores');
      return;
    }

    try {
      setLoading(true);
      
      // Create node
      const nodeResponse = await createNode(labels, propsObject);
      const nodeData: CreateNodeResponse = await nodeResponse.json();
      
      if (!nodeResponse.ok) {
        throw new Error(nodeData.message || 'Failed to create node');
      }
      
      // Redirect to node info page
      router.push(`/info?nodeId=${encodeURIComponent(nodeData.node.id)}`);
    } catch (error) {
      console.error('Create node error:', error);
      setError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    router.push('/');
  };

  return (
    <div>
      <Header />
      
      <div className="container mt-4">
        <h1>Create Node</h1>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label htmlFor="nodeLabels" className="form-label">
              Node Labels (comma-separated)
            </label>
            <input
              type="text"
              className="form-control"
              id="nodeLabels"
              placeholder="e.g., Author, Edition"
              value={nodeLabels}
              onChange={(e) => setNodeLabels(e.target.value)}
              required />
          </div>
          
          <div className="mb-3">
            <label className="form-label">Properties</label>
            <table className="table table-bordered" id="propertiesTable">
              <thead>
                <tr>
                  <th scope="col">Name</th>
                  <th scope="col">Value</th>
                </tr>
              </thead>
              <tbody>
                {properties.map((prop, index) => (
                  <tr key={index} className="property-row">
                    <td>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="e.g., name, title"
                        value={prop.name}
                        onChange={(e) => handlePropertyChange(index, 'name', e.target.value)} />
                    </td>
                    <td>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="e.g., Jane Doe, The Iliad"
                        value={prop.value}
                        onChange={(e) => handlePropertyChange(index, 'value', e.target.value)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button
              type="button"
              className="btn btn-secondary mb-3"
              onClick={handleAddProperty} >
              Add Property
            </button>
          </div>
          
          {error && (
            <div className="text-danger mb-3">
              {error}
            </div>
          )}
          
          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading} >
            {loading ? 'Creating...' : 'Create Node'}
          </button>
          <button
            type="button"
            className="btn btn-link"
            onClick={handleCancel} >
            Cancel
          </button>
        </form>
      </div>
    </div>
  );
};

export default CreateNodePage;
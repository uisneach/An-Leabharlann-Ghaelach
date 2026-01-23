'use client'
import React, { useState } from 'react';
import { Search, Plus, Trash2, Database, AlertCircle, CheckCircle } from 'lucide-react';

type ApiResponse = {
  status: number;
  data: any;
} | null;

export default function ApiControlPanel() {
  const [activeTab, setActiveTab] = useState('get');
  const [response, setResponse] = useState<ApiResponse>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);;

  // Get Node state
  const [getLabel, setGetLabel] = useState('');
  const [getNodeId, setGetNodeId] = useState('');
  const [getLimit, setGetLimit] = useState('');

  // Create Node state
  const [createLabel, setCreateLabel] = useState('');
  const [createProperties, setCreateProperties] = useState('{\n  "name": "Example",\n  "age": 30\n}');

  // Delete Node state
  const [deleteLabel, setDeleteLabel] = useState('');
  const [deleteNodeId, setDeleteNodeId] = useState('');

  const apiBaseUrl = 'https://leabharlann.uisneac.com/api/nodes';

  const handleGetNode = async () => {
    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      const params = new URLSearchParams();
      if (getLabel) params.append('label', getLabel);
      if (getNodeId) params.append('nodeId', getNodeId);
      if (getLimit) params.append('limit', getLimit);

      const res = await fetch(`${apiBaseUrl}/get?${params.toString()}`);
      const data = await res.json();
      
      setResponse({ status: res.status, data });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNode = async () => {
    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      let properties;
      try {
        properties = JSON.parse(createProperties);
      } catch (e) {
        throw new Error('Invalid JSON in properties field');
      }

      const res = await fetch(`${apiBaseUrl}/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          label: createLabel,
          properties
        })
      });
      
      const data = await res.json();
      setResponse({ status: res.status, data });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteNode = async () => {
    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      const res = await fetch(`${apiBaseUrl}/delete?label=${deleteLabel}&nodeId=${deleteNodeId}`, {
        method: 'DELETE'
      });
      
      const data = await res.json();
      setResponse({ status: res.status, data });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleHealthCheck = async () => {
    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      const res = await fetch('/api/health');
      const data = await res.json();
      setResponse({ status: res.status, data });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
            <Database className="w-10 h-10 text-blue-400" />
            Neo4j API Control Panel
          </h1>
          <p className="text-slate-400">Build queries and test your Neo4j API endpoints</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Panel - Query Builder */}
          <div className="bg-slate-800/50 backdrop-blur rounded-lg border border-slate-700 p-6">
            <h2 className="text-xl font-semibold mb-4">Query Builder</h2>

            {/* Tabs */}
            <div className="flex gap-2 mb-6 border-b border-slate-700">
              <button
                onClick={() => setActiveTab('get')}
                className={`px-4 py-2 font-medium transition-colors ${
                  activeTab === 'get'
                    ? 'text-blue-400 border-b-2 border-blue-400'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Search className="w-4 h-4 inline mr-2" />
                GET
              </button>
              <button
                onClick={() => setActiveTab('create')}
                className={`px-4 py-2 font-medium transition-colors ${
                  activeTab === 'create'
                    ? 'text-green-400 border-b-2 border-green-400'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Plus className="w-4 h-4 inline mr-2" />
                CREATE
              </button>
              <button
                onClick={() => setActiveTab('delete')}
                className={`px-4 py-2 font-medium transition-colors ${
                  activeTab === 'delete'
                    ? 'text-red-400 border-b-2 border-red-400'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Trash2 className="w-4 h-4 inline mr-2" />
                DELETE
              </button>
              <button
                onClick={() => setActiveTab('health')}
                className={`px-4 py-2 font-medium transition-colors ${
                  activeTab === 'health'
                    ? 'text-purple-400 border-b-2 border-purple-400'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Database className="w-4 h-4 inline mr-2" />
                HEALTH
              </button>
            </div>

            {/* GET Form */}
            {activeTab === 'get' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Label</label>
                  <input
                    type="text"
                    value={getLabel}
                    onChange={(e) => setGetLabel(e.target.value)}
                    placeholder="e.g., User, Product"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded focus:outline-none focus:border-blue-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Node ID (optional)</label>
                  <input
                    type="text"
                    value={getNodeId}
                    onChange={(e) => setGetNodeId(e.target.value)}
                    placeholder="Leave empty to query by label"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded focus:outline-none focus:border-blue-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Limit (0 = no limit)</label>
                  <input
                    type="number"
                    value={getLimit}
                    onChange={(e) => setGetLimit(e.target.value)}
                    placeholder="10"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded focus:outline-none focus:border-blue-400"
                  />
                </div>
                <button
                  onClick={handleGetNode}
                  disabled={loading}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 px-4 py-2 rounded font-medium transition-colors"
                >
                  {loading ? 'Loading...' : 'Get Node(s)'}
                </button>
              </div>
            )}

            {/* CREATE Form */}
            {activeTab === 'create' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Label *</label>
                  <input
                    type="text"
                    value={createLabel}
                    onChange={(e) => setCreateLabel(e.target.value)}
                    placeholder="e.g., User, Product"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded focus:outline-none focus:border-green-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Properties (JSON) *</label>
                  <textarea
                    value={createProperties}
                    onChange={(e) => setCreateProperties(e.target.value)}
                    rows={8}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded focus:outline-none focus:border-green-400 font-mono text-sm"
                  />
                  <p className="text-xs text-slate-400 mt-1">
                    ID will be auto-generated if not provided
                  </p>
                </div>
                <button
                  onClick={handleCreateNode}
                  disabled={loading}
                  className="w-full bg-green-600 hover:bg-green-700 disabled:bg-slate-600 px-4 py-2 rounded font-medium transition-colors"
                >
                  {loading ? 'Creating...' : 'Create Node'}
                </button>
              </div>
            )}

            {/* DELETE Form */}
            {activeTab === 'delete' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Label *</label>
                  <input
                    type="text"
                    value={deleteLabel}
                    onChange={(e) => setDeleteLabel(e.target.value)}
                    placeholder="e.g., User"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded focus:outline-none focus:border-red-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Node ID *</label>
                  <input
                    type="text"
                    value={deleteNodeId}
                    onChange={(e) => setDeleteNodeId(e.target.value)}
                    placeholder="Node ID to delete"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded focus:outline-none focus:border-red-400"
                  />
                </div>
                <button
                  onClick={handleDeleteNode}
                  disabled={loading}
                  className="w-full bg-red-600 hover:bg-red-700 disabled:bg-slate-600 px-4 py-2 rounded font-medium transition-colors"
                >
                  {loading ? 'Deleting...' : 'Delete Node'}
                </button>
              </div>
            )}

            {/* HEALTH Check */}
            {activeTab === 'health' && (
              <div className="space-y-4">
                <p className="text-slate-400 text-sm">
                  Check the connection status to your Neo4j database.
                </p>
                <button
                  onClick={handleHealthCheck}
                  disabled={loading}
                  className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-slate-600 px-4 py-2 rounded font-medium transition-colors"
                >
                  {loading ? 'Checking...' : 'Check Health'}
                </button>
              </div>
            )}
          </div>

          {/* Right Panel - Response */}
          <div className="bg-slate-800/50 backdrop-blur rounded-lg border border-slate-700 p-6">
            <h2 className="text-xl font-semibold mb-4">Response</h2>

            {error && (
              <div className="bg-red-900/20 border border-red-700 rounded p-4 mb-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-red-400">Error</p>
                  <p className="text-sm text-red-300 mt-1">{error}</p>
                </div>
              </div>
            )}

            {response && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <span className={`px-3 py-1 rounded text-sm font-medium ${
                    response.status >= 200 && response.status < 300
                      ? 'bg-green-900/30 text-green-400 border border-green-700'
                      : 'bg-red-900/30 text-red-400 border border-red-700'
                  }`}>
                    {response.status >= 200 && response.status < 300 ? (
                      <CheckCircle className="w-4 h-4 inline mr-1" />
                    ) : (
                      <AlertCircle className="w-4 h-4 inline mr-1" />
                    )}
                    Status: {response.status}
                  </span>
                </div>

                <div className="bg-slate-900 rounded border border-slate-700 p-4 overflow-auto max-h-96">
                  <pre className="text-sm text-slate-300 whitespace-pre-wrap">
                    {JSON.stringify(response.data, null, 2)}
                  </pre>
                </div>
              </div>
            )}

            {!response && !error && !loading && (
              <div className="text-center py-12 text-slate-500">
                <Database className="w-16 h-16 mx-auto mb-4 opacity-20" />
                <p>Execute a query to see the response</p>
              </div>
            )}

            {loading && (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto"></div>
                <p className="text-slate-400 mt-4">Loading...</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
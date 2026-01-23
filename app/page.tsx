'use client'

import Image from "next/image";
import Welcome from "./Welcome";
import NodeList from "./NodeList";
import React, { useState, useEffect } from 'react';

const defaultLabels = ['Author', 'Text', 'Edition'];

/*export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <Welcome />
      <div className="node-list-container">
        <NodeList />
      </div>
    </div>
  );
}*/

export default function Home() {
  const [allLabels, setAllLabels] = useState<string[]>([]);
  const [activeLabels, setActiveLabels] = useState<string[]>(defaultLabels);
  const [selectedLabel, setSelectedLabel] = useState('');
  const [loadingLabels, setLoadingLabels] = useState(true);
  const [errorLabels, setErrorLabels] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAllLabels() {
      setLoadingLabels(true);
      setErrorLabels(null);
      try {
        const res = await fetch('/api/labels'); // Assuming an API endpoint that returns { labels: string[] }
        if (!res.ok) {
          throw new Error(`Failed to load labels: ${res.status} ${res.statusText}`);
        }
        const data = await res.json();
        setAllLabels((data.labels || []).sort());
      } catch (err) {
        setErrorLabels(err instanceof Error ? err.message : 'An unknown error occurred');
      } finally {
        setLoadingLabels(false);
      }
    }
    fetchAllLabels();
  }, []);

  const availableLabels = allLabels.filter((l) => !activeLabels.includes(l));

  const addLabel = () => {
    if (selectedLabel && !activeLabels.includes(selectedLabel)) {
      setActiveLabels([...activeLabels, selectedLabel]);
      setSelectedLabel('');
    }
  };

  const removeLabel = (label: string) => {
    setActiveLabels(activeLabels.filter((l) => l !== label));
  };

  return (
    <div>
      <div id="welcome-message" className="container-fluid">
        <h2>Fáilte go dtí an Leabharlann Ghaelach</h2>
        <p>Explore our digital library of Irish and Celtic texts, or sign up to contribute to the database. Learn how to navigate and use the collection in our <a href="/leabharlann/how-to/index.html">User Guide</a>.</p>
      </div>

      <div id="content" className="container-fluid" style={{ position: 'relative' }}>
        {/* Global spinner could be added here if needed for initial load */}
        {loadingLabels && <div className="text-center">Loading labels...</div>}
        {errorLabels && <div className="text-danger">Error loading labels: {errorLabels}</div>}

        <div className="mb-3">
          <label htmlFor="add-label-select" className="form-label">More Pages by Type:</label>
          <select 
            id="add-label-select" 
            className="form-select w-auto d-inline-block" 
            value={selectedLabel} 
            onChange={(e) => setSelectedLabel(e.target.value)}
          >
            <option value="">Select a label</option>
            {availableLabels.map((label) => (
              <option key={label} value={label}>
                {label}
              </option>
            ))}
          </select>
          <button id="add-label-btn" className="btn btn-primary ms-2" onClick={addLabel}>
            Add
          </button>
        </div>
        <div id="columns" className="row">
          {activeLabels.map((label) => (
            <NodeList 
              key={label} 
              label={label} 
              onRemove={() => removeLabel(label)} 
              isDefault={defaultLabels.includes(label)} 
              totalColumns={activeLabels.length} 
            />
          ))}
        </div>
      </div>
    </div>
  );
}
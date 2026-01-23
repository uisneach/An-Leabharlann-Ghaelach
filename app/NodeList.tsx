// NodeList.tsx
import React from 'react';
import { Spinner } from 'react-bootstrap';

interface NodeListProps {
  label: string;
  nodes: any[];
  isAuthenticated: boolean;
  onRemove: (label: string) => void;
  loading?: boolean;
  error?: string;
  labelKeys?: string | string[];
}

const NodeList: React.FC<NodeListProps> = ({ label, nodes, isAuthenticated, onRemove, loading = false, error, labelKeys = ['display_name', 'name', 'title'] }) => {
  const getTitle = (item: any) => {
    const properties = item?.properties || {};
    const keys = Array.isArray(labelKeys) ? labelKeys : [labelKeys];
    return keys.reduce((result, key) => result || properties[key], '') || item.id || 'Unknown';
  };

  const sortedNodes = [...nodes].sort((a, b) => {
    const ta = String(getTitle(a)).trim().toLowerCase();
    const tb = String(getTitle(b)).trim().toLowerCase();
    return ta.localeCompare(tb, undefined, { sensitivity: 'base', numeric: false });
  });

  return (
    <div className="col-md-4" id={`col-${label}`}>
      <div className="d-flex justify-content-between align-items-center">
        <h2 className="section-title">
          {label}s <a href={`/leabharlann/label/index.html?label=${label}`} className="ms-2 text-decoration-none" style={{ fontSize: 16 }}>See All→</a>
        </h2>
        <div>
          {isAuthenticated && (
            <a href={`/leabharlann/create/index.html?label=${encodeURIComponent(label)}`} className="btn btn-sm btn-primary create-btn">+</a>
          )}
          <button className="btn btn-sm btn-danger remove-btn" onClick={() => onRemove(label)}>Remove</button>
        </div>
      </div>
      {loading ? (
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
      ) : error ? (
        <p className="text-danger">{error}</p>
      ) : (
        <ul id={`${label}-list`} className="node-list">
          {sortedNodes.map((item, index) => (
            <li key={index}>
              <a href={`/leabharlann/info/index.html?id=${encodeURIComponent(item.id)}`}>{getTitle(item)}</a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default NodeList;
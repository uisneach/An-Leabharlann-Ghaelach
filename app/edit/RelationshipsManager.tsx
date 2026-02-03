import React from 'react';
import { cleanString } from '@/lib/utils';

interface Node {
  id: string;
  nodeId: string;
  properties: {
    display_name?: string;
    name?: string;
    title?: string;
    [key: string]: any;
  };
}

interface Relationship {
  type: string;
  node: Node;
}

interface RelationshipsManagerProps {
  nodeId: string;
  nodeTitle: string;
  incoming: Relationship[];
  outgoing: Relationship[];
  onDeleteRelationship: (sourceId: string, targetId: string, relType: string) => void;
}

/**
 * Component for managing node relationships
 */
const RelationshipsManager: React.FC<RelationshipsManagerProps> = ({
  nodeId,
  nodeTitle,
  incoming,
  outgoing,
  onDeleteRelationship
}) => {
  // Group relationships by type
  const allRelTypes = new Map<string, { incoming: Relationship[], outgoing: Relationship[] }>();
  
  incoming.forEach(rel => {
    if (!allRelTypes.has(rel.type)) {
      allRelTypes.set(rel.type, { incoming: [], outgoing: [] });
    }
    allRelTypes.get(rel.type)!.incoming.push(rel);
  });
  
  outgoing.forEach(rel => {
    if (!allRelTypes.has(rel.type)) {
      allRelTypes.set(rel.type, { incoming: [], outgoing: [] });
    }
    allRelTypes.get(rel.type)!.outgoing.push(rel);
  });

  const getNodeLabel = (node: Node): string => {
    return node.properties.display_name || 
           node.properties.name || 
           node.properties.title || 
           node.nodeId;
  };

  return (
    <div className="mt-5" id="relationships-container">
      <h3 className="h4 border-bottom pb-2 mb-3">Manage Relationships</h3>
      
      {Array.from(allRelTypes.entries()).map(([relType, { incoming: inRels, outgoing: outRels }]) => (
        <div key={relType} className="rels-section mb-4">
          <h4 className="h5">{cleanString(relType)}</h4>
          
          {inRels.length > 0 && (
            <div className="mb-3">
              <h5 className="h6 text-muted">Incoming</h5>
              <ul className="rels-list list-unstyled">
                {inRels.map((rel, idx) => {
                  const fromNode = rel.node;
                  const fromLabel = getNodeLabel(fromNode);
                  
                  return (
                    <li key={idx} className="mb-2">
                      <a href={`/info?id=${encodeURIComponent(fromNode.nodeId || fromNode.id)}`}>
                        {fromLabel}
                      </a>
                      {' '}==[{relType}]==&gt;{' '}
                      <a href={`/info?id=${encodeURIComponent(nodeId)}`}>
                        {nodeTitle}
                      </a>
                      <button 
                        className="btn btn-sm btn-danger ms-2"
                        onClick={() => onDeleteRelationship(fromNode.id, nodeId, relType)}
                      >
                        Delete
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
          
          {outRels.length > 0 && (
            <div className="mb-3">
              <h5 className="h6 text-muted">Outgoing</h5>
              <ul className="rels-list list-unstyled">
                {outRels.map((rel, idx) => {
                  const toNode = rel.node;
                  const toLabel = getNodeLabel(toNode);
                  
                  return (
                    <li key={idx} className="mb-2">
                      <a href={`/info?id=${encodeURIComponent(nodeId)}`}>
                        ({nodeTitle})
                      </a>
                      {' '}==[{relType}]==&gt;{' '}
                      <a href={`/info?id=${encodeURIComponent(toNode.nodeId || toNode.id)}`}>
                        ({toLabel})
                      </a>
                      <button 
                        className="btn btn-sm btn-danger ms-2"
                        onClick={() => onDeleteRelationship(nodeId, toNode.id, relType)}
                      >
                        Delete
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      ))}

      <a 
        href={`/leabharlann/relationship/index.html?fromId=${encodeURIComponent(nodeId)}`} 
        className="btn btn-primary"
      >
        Create New Relationship
      </a>
    </div>
  );
};

export default RelationshipsManager;
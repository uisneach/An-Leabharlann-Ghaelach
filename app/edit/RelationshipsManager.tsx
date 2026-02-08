import React, { useState, useEffect } from 'react';
import { cleanString, getNodeDisplayName } from '@/lib/utils';
import { NodeData, Relationship } from '@/lib/types';
import RelationshipCreator from '@/app/RelationshipCreator';

interface RelationshipsManagerProps {
  nodeData: NodeData;
  onEditRelationships: (relationships: Relationship[]) => void;
}

/**
 * Component for managing node relationships and creating new ones
 */
const RelationshipsManager: React.FC<RelationshipsManagerProps> = ({
  nodeData,
  onEditRelationships
}) => {
  const nodeTitle = getNodeDisplayName(nodeData);

  // This component doesn't edit relationships. It just marks some for deletion
  // and stages others in a staging variable to be submitted later. It passes
  // these changes to the parent page for submission there.
  const [ stagedRels, setStagedRels ] = useState<Relationship[]>([]);
  const [ relsToDelete, setRelsToDelete ] = useState<Relationship[]>([]);

  // Reset staged and deletes when nodeData changes (e.g., after save or new node)
  useEffect(() => {
    setStagedRels([]);
    setRelsToDelete([]);
  }, [nodeData]);

  // Helper to compare two relationships for equality (unique by from, to, type)
  const isSameRel = (a: Relationship, b: Relationship): boolean => {
    return (
      a.fromNode.nodeId === b.fromNode.nodeId &&
      a.toNode.nodeId === b.toNode.nodeId &&
      a.type === b.type
    );
  };

  // Compute original relationships from nodeData
  const originalRels: Relationship[] = [...nodeData.incoming, ...nodeData.outgoing];

  // Compute effective relationships: original - deleted + staged
  const effectiveRels: Relationship[] = [
    ...originalRels.filter((r) => !relsToDelete.some((d) => isSameRel(r, d))),
    ...stagedRels,
  ];

  // Group relationships by type
  const allRelTypes = new Map<string, { incoming: Relationship[], outgoing: Relationship[] }>();

  nodeData.incoming.forEach(rel => {
    if (!allRelTypes.has(rel.type)) {
      allRelTypes.set(rel.type, { incoming: [], outgoing: [] });
    }
    allRelTypes.get(rel.type)!.incoming.push(rel);
  });
  
  nodeData.outgoing.forEach(rel => {
    if (!allRelTypes.has(rel.type)) {
      allRelTypes.set(rel.type, { incoming: [], outgoing: [] });
    }
    allRelTypes.get(rel.type)!.outgoing.push(rel);
  });

  console.log('staged rels');
  console.log(stagedRels);

  const handleCreateRelationship = (rel: Relationship) => {
    // Compute new staged
    const newStagedRels = [...stagedRels, rel];
    setStagedRels(newStagedRels);

    // Compute and send effective to parent
    const newEffectiveRels = [
      ...originalRels.filter((r) => !relsToDelete.some((d) => isSameRel(r, d))),
      ...newStagedRels,
    ];
    onEditRelationships(newEffectiveRels);
  }

  const handleDeleteRelationship = (rel: Relationship) => {
    // Check if it's staged or original
    const isStaged = stagedRels.some((s) => isSameRel(s, rel));

    let newEffectiveRels: Relationship[];

    if (isStaged) {
      // Remove from staged
      const newStagedRels = stagedRels.filter((s) => !isSameRel(s, rel));
      setStagedRels(newStagedRels);

      // Compute effective
      newEffectiveRels = [
        ...originalRels.filter((r) => !relsToDelete.some((d) => isSameRel(r, d))),
        ...newStagedRels,
      ];
    } else {
      // Add to deletes since it's original
      const newRelsToDelete = [...relsToDelete, rel];
      setRelsToDelete(newRelsToDelete);

      // Compute effective
      newEffectiveRels = [
        ...originalRels.filter((r) => !newRelsToDelete.some((d) => isSameRel(r, d))),
        ...stagedRels,
      ];
    }

    // Send to parent
    onEditRelationships(newEffectiveRels);
  };

  const handleUndoDelete = (rel: Relationship) => {
    // Remove from deletes
    const newRelsToDelete = relsToDelete.filter((d) => !isSameRel(d, rel));
    setRelsToDelete(newRelsToDelete);

    // Compute effective
    const newEffectiveRels = [
      ...originalRels.filter((r) => !newRelsToDelete.some((d) => isSameRel(r, d))),
      ...stagedRels,
    ];

    // Send to parent
    onEditRelationships(newEffectiveRels);
  };

  return (
    <div className="mt-5" id="relationships-container">
      <h2 className="h2 border-bottom pb-2 mb-3">Manage Relationships</h2>
      
      {/* Existing Relationships */}
      {Array.from(allRelTypes.entries()).map(([relType, { incoming: inRels, outgoing: outRels }]) => (
        <div key={relType} className="rels-section mb-4">
          <h4 className="h5">{cleanString(relType)}</h4>
          
          {inRels.length > 0 && (
            <div className="mb-3">
              <h5 className="h6 text-muted">Incoming</h5>
              <ul className="rels-list list-unstyled">
                {inRels.map((rel, idx) => {
                  const fromNode = rel.fromNode;
                  const fromLabel = getNodeDisplayName(fromNode);
                  console.log(relsToDelete.some((d) => isSameRel(d, rel)));
                  
                  return (
                    <li key={idx} className="mb-2">
                      <a href={`/info?id=${encodeURIComponent(fromNode.nodeId)}`}>
                        {fromLabel}
                      </a>
                      {' '}==[{rel.type}]==&gt;{' '}
                      <a href={`/info?id=${encodeURIComponent(nodeData.nodeId)}`}>
                        {nodeTitle}
                      </a>
                      <button 
                        className="btn btn-sm btn-danger ms-2"
                        onClick={() => onDeleteRelationship(fromNode.nodeId, nodeData.nodeId, rel.type)}
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
                  const toNode = rel.toNode;
                  const toLabel = getNodeDisplayName(toNode);
                  
                  return (
                    <li key={idx} className="mb-2">
                      <a href={`/info?id=${encodeURIComponent(nodeData.nodeId)}`}>
                        {nodeTitle}
                      </a>
                      {' '}==[{rel.type}]==&gt;{' '}
                      <a href={`/info?id=${encodeURIComponent(toNode.nodeId)}`}>
                        {toLabel}
                      </a>
                      <button 
                        className="btn btn-sm btn-danger ms-2"
                        onClick={() => onDeleteRelationship(nodeData.nodeId, toNode.nodeId, rel.type)}
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

      {/* No relationships message */}
      {nodeData.incoming.length === 0 && nodeData.outgoing.length === 0 && (
        <div className="alert alert-info" style={{ textAlign: 'center' }}>
          This node has no relationships yet.
          <br /><br />
        </div>
      )}

      {/* Create New Relationship */}
      {onEditRelationships && (
        <div className="mt-4">
          <RelationshipCreator 
            currentNodeId={nodeData.nodeId}
            currentNodeTitle={nodeTitle}
            onCreateRelationship={handleCreateRelationship}
          />
        </div>
      )}
    </div>
  );
};

export default RelationshipsManager;
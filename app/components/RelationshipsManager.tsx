import React, { useState, useEffect } from 'react';
import styles from '@/public/styles/relationshipsmanager.module.css';
import { cleanString, getNodeDisplayName, isSameRel } from '@/lib/utils';
import { NodeData, Relationship } from '@/lib/types';
import RelationshipCreator from '@/app/components/RelationshipCreator';

interface RelationshipsManagerProps {
  nodeData?: NodeData | null;
  onEditRelationships: (relationships: Relationship[]) => void;
}

/**
 * Component for managing node relationships and creating new ones.
 * nodeData is optional — when absent (e.g. on the create page), the component
 * operates in staging-only mode with no existing relationships to display.
 */
const RelationshipsManager: React.FC<RelationshipsManagerProps> = ({
  nodeData,
  onEditRelationships
}) => {
  // Safe fallbacks for when nodeData is not yet available
  const nodeId    = nodeData?.nodeId ?? '';
  const nodeTitle = (nodeData ? getNodeDisplayName(nodeData) : null) ?? 'Node';
  const incoming  = nodeData?.incoming ?? [];
  const outgoing  = nodeData?.outgoing ?? [];

  const [stagedRels, setStagedRels] = useState<Relationship[]>([]);
  const [relsToDelete, setRelsToDelete] = useState<Relationship[]>([]);

  // Reset staged and deletes when nodeData changes (e.g., after save or new node)
  useEffect(() => {
    setStagedRels([]);
    setRelsToDelete([]);
  }, [nodeData]);

  const isStaged = (rel: Relationship): boolean =>
    stagedRels.some((d) => isSameRel(d, rel));

  const isMarkedForDelete = (rel: Relationship): boolean =>
    relsToDelete.some((d) => isSameRel(d, rel));

  // Compute original relationships from nodeData (empty when nodeData is absent)
  const originalRels: Relationship[] = [...incoming, ...outgoing];

  // Group relationships by type (original + staged)
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

  stagedRels.forEach(rel => {
    if (!allRelTypes.has(rel.type)) {
      allRelTypes.set(rel.type, { incoming: [], outgoing: [] });
    }
    allRelTypes.get(rel.type)!.outgoing.push(rel);
  });

  const handleCreateRelationship = (rel: Relationship) => {
    const newStagedRels = [...stagedRels, rel];
    setStagedRels(newStagedRels);

    const newEffectiveRels = [
      ...originalRels.filter((r) => !relsToDelete.some((d) => isSameRel(r, d))),
      ...newStagedRels,
    ];
    onEditRelationships(newEffectiveRels);
  };

  const handleDeleteRelationship = (rel: Relationship) => {
    const relIsStaged = stagedRels.some((s) => isSameRel(s, rel));
    let newEffectiveRels: Relationship[];

    if (relIsStaged) {
      const newStagedRels = stagedRels.filter((s) => !isSameRel(s, rel));
      setStagedRels(newStagedRels);
      newEffectiveRels = [
        ...originalRels.filter((r) => !relsToDelete.some((d) => isSameRel(r, d))),
        ...newStagedRels,
      ];
    } else {
      const newRelsToDelete = [...relsToDelete, rel];
      setRelsToDelete(newRelsToDelete);
      newEffectiveRels = [
        ...originalRels.filter((r) => !newRelsToDelete.some((d) => isSameRel(r, d))),
        ...stagedRels,
      ];
    }

    onEditRelationships(newEffectiveRels);
  };

  const handleUndoDelete = (rel: Relationship) => {
    const newRelsToDelete = relsToDelete.filter((d) => !isSameRel(d, rel));
    setRelsToDelete(newRelsToDelete);

    const newEffectiveRels = [
      ...originalRels.filter((r) => !newRelsToDelete.some((d) => isSameRel(r, d))),
      ...stagedRels,
    ];

    onEditRelationships(newEffectiveRels);
  };

  return (
    <div className="mt-5" id="relationships-container">
      <h2 className="h2 border-bottom pb-2 mb-3">Manage Relationships</h2>

      {/* Existing Relationships — only rendered when nodeData is present */}
      {nodeData && Array.from(allRelTypes).map(([relType, { incoming: inRels, outgoing: outRels }]) => (
        <div key={relType} className="rels-section mb-4">
          <h4 className={`h5 ${styles.sectionTitle}`}>{cleanString(relType)}</h4>

          {inRels.length > 0 && (
            <div className="mb-3">
              <h5 className="h6 text-muted">Incoming</h5>
              <ul className="rels-list list-unstyled">
                {inRels.map((rel, idx) => {
                  const fromNode = rel.fromNode;
                  const fromLabel = getNodeDisplayName(fromNode);

                  return (
                    <li key={idx} className={`mb-2 ${styles.relElement}`}>
                      <a href={`/info?id=${encodeURIComponent(fromNode.nodeId)}`}>
                        {fromLabel}
                      </a>
                      {' '}==[{rel.type}]==&gt;{' '}
                      <a href={`/info?id=${encodeURIComponent(nodeId)}`}>
                        {nodeTitle}
                      </a>
                      {isMarkedForDelete(rel)
                        ? <button className="btn btn-sm ms-2" onClick={() => handleUndoDelete(rel)}>Undo</button>
                        : <button className="btn btn-sm btn-danger ms-2" onClick={() => handleDeleteRelationship(rel)}>Delete</button>
                      }
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
                  const staged  = isStaged(rel);
                  const deleted = isMarkedForDelete(rel);

                  return (
                    <li
                      key={idx}
                      className={`mb-2 ${styles.relElement}`}
                      style={
                        staged  ? { backgroundColor: '#d4edda', borderLeft: '4px solid #28a745', padding: '10px 0 10px 8px', alignItems: 'center' } :
                        deleted ? { backgroundColor: '#f8d7da', borderLeft: '4px solid #dc3545', padding: '10px 0 10px 8px', alignItems: 'center' } :
                        {}
                      }
                    >
                      <a
                        href={`/info?id=${encodeURIComponent(nodeId)}`}
                        style={deleted ? { textDecoration: 'line-through', margin: 'auto 0' } : { margin: 'auto 0' }}
                      >
                        {nodeTitle}
                      </a>
                      <span style={deleted ? { textDecoration: 'line-through', margin: 'auto 0' } : { margin: 'auto 0' }}>
                        ==[{rel.type}]==&gt;
                      </span>
                      <a
                        href={`/info?id=${encodeURIComponent(toNode.nodeId)}`}
                        style={deleted ? { textDecoration: 'line-through', margin: 'auto 0' } : { margin: 'auto 0' }}
                      >
                        {toLabel}
                      </a>
                      {deleted
                        ? <button className="btn btn-sm ms-2" style={{ textDecoration: 'none' }} onClick={() => handleUndoDelete(rel)}>Undo</button>
                        : <button className="btn btn-sm btn-danger ms-2" onClick={() => handleDeleteRelationship(rel)}>Delete</button>
                      }
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      ))}

      {/* No relationships message */}
      {incoming.length === 0 && outgoing.length === 0 && stagedRels.length === 0 && (
        <div className="alert alert-info" style={{ textAlign: 'center' }}>
          This node has no relationships yet.
          <br /><br />
        </div>
      )}

      {/* Create New Relationship */}
      <RelationshipCreator
        currentNodeId={nodeId}
        currentNodeTitle={nodeTitle}
        onCreateRelationship={handleCreateRelationship}
      />
    </div>
  );
};

export default RelationshipsManager;
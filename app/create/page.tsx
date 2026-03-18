'use client'

import { useState, useEffect } from 'react';
import styles from '@/public/styles/create.module.css';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/AuthContext';
import Header from '@/app/Header';
import Footer from '@/app/Footer';
import LabelsEditor from '@/app/components/LabelsEditor';
import PropertiesTable from '@/app/components/PropertiesTable';
import RelationshipsManager from '@/app/components/RelationshipsManager';
import { createNode, createRelationship } from '@/lib/api';
import { validateLabel } from '@/lib/utils';
import { Relationship } from '@/lib/types';

// Properties that should use textarea instead of input
const LONG_TEXT_PROPERTIES = ['description', 'contents', 'summary', 'biography', 'analysis'];

const CreateNodePage = () => {
  const router = useRouter();
  const { isAuthenticated, username, checkAuthStatus } = useAuth();
  
  const [labels, setLabels] = useState<string[]>([]);
  const [properties, setProperties] = useState<Record<string, any>>([]);
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'labels' | 'properties' | 'relationships'>('labels');
  const [authChecked, setAuthChecked] = useState<boolean>(false);



  useEffect(() => {
    const timer = setTimeout(() => {
      setAuthChecked(true);
      if (!isAuthenticated) {
        router.push('/');
      }
    }, 100);
    
    return () => clearTimeout(timer);
  }, [isAuthenticated, router]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const label = params.get('label');
      if (label) {
        setLabels([label]);
      }
    }
  }, []);

  const handleEditRelationships = (relList: Relationship[]) => {
    setRelationships(relList);
  };

  const handleSubmit = async () => {
    setError('');

    // Validate labels
    if (labels.length === 0) {
      setError('At least one label is required');
      setActiveTab('labels');
      return;
    }

    for (const label of labels) {
      const validation = validateLabel(label);
      if (!validation.valid) {
        setError(`Invalid label "${label}": ${validation.error}`);
        setActiveTab('labels');
        return;
      }
    }

    // properties is already a clean Record<string, any> from PropertiesTable — use directly
    try {
      setLoading(true);

      const nodeResponse = await createNode(labels, properties);
      const nodeData = await nodeResponse.json();

      if (!nodeResponse.ok) {
        throw new Error(nodeData.message || nodeData.error || 'Failed to create node');
      }

      const newNodeId = nodeData.node.id || nodeData.node.nodeId;

      // RelationshipsManager stages rels with the placeholder nodeId '' for the not-yet-created node.
      // Replace that placeholder with the real newNodeId when calling the API.
      const relationshipPromises = relationships.map((rel) => {
        const fromId = rel.fromNode.nodeId === '' ? newNodeId : rel.fromNode.nodeId;
        const toId   = rel.toNode.nodeId   === '' ? newNodeId : rel.toNode.nodeId;
        return createRelationship(fromId, toId, rel.type);
      });

      await Promise.all(relationshipPromises);

      router.push(`/info?id=${encodeURIComponent(newNodeId)}`);
    } catch (err) {
      console.error('Create node error:', err);
      setError(err instanceof Error ? err.message : 'Failed to create node');
      setLoading(false);
    }
  };

  const handleCancel = () => {
    router.push('/');
  };

  if (!authChecked) {
    return (
      <div>
        <Header 
          isAuthenticated={isAuthenticated}
          username={username}
          onAuthChange={checkAuthStatus} 
        />
        <div className={styles.pageContainer}>
          <div className={styles.loadingContainer}>
            <div className={styles.loadingSpinner} role="status">
              <span className={styles.loadingText}>Loading...</span>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div>
      <Header 
        isAuthenticated={isAuthenticated}
        username={username}
        onAuthChange={checkAuthStatus} 
      />
      
      <div className={styles.pageContainer}>
        <h1 className={styles.pageTitle}>Create New Node</h1>
        
        {error && (
          <div className={`${styles.alert} ${styles.alertDanger}`}>
            {error}
            <button type="button" className={styles.alertClose} onClick={() => setError('')}>×</button>
          </div>
        )}
        
        <ul className={styles.tabs}>
          <li className={styles.tabItem}>
            <button 
              className={`${styles.tabButton} ${activeTab === 'labels' ? styles.active : ''}`}
              onClick={() => setActiveTab('labels')}
            >
              Labels {labels.length > 0 && <span className={styles.tabBadge}>{labels.length}</span>}
            </button>
          </li>
          <li className={styles.tabItem}>
            <button 
              className={`${styles.tabButton} ${activeTab === 'properties' ? styles.active : ''}`}
              onClick={() => setActiveTab('properties')}
            >
              Properties {properties.length > 0 && <span className={styles.tabBadge}>{properties.length}</span>}
            </button>
          </li>
          <li className={styles.tabItem}>
            <button 
              className={`${styles.tabButton} ${activeTab === 'relationships' ? styles.active : ''}`}
              onClick={() => setActiveTab('relationships')}
            >
              Relationships {relationships.length > 0 && <span className={styles.tabBadge}>{relationships.length}</span>}
            </button>
          </li>
        </ul>
        
        {activeTab === 'labels' && (
          <div className={`${styles.tabContent} ${styles.active}`}>
            <LabelsEditor
              labels={labels}
              onLabelsChange={setLabels} />
          </div>
        )}
        
        {activeTab === 'properties' && (
          <div className={`${styles.tabContent} ${styles.active}`}>
            <PropertiesTable
              properties={properties}
              onPropertiesChange={setProperties} />
          </div>
        )}
        
        {activeTab === 'relationships' && (
          <div className={`${styles.tabContent} ${styles.active}`}>
            <RelationshipsManager 
              onEditRelationships={handleEditRelationships}
            />
          </div>
        )}
        
        <div className={styles.actions}>
          <button
            className={styles.submitButton}
            onClick={handleSubmit}
            disabled={loading || labels.length === 0}>
            {loading ? (
              <>
                <span className={styles.spinner} role="status" aria-hidden="true"></span>
                Creating...
              </>
            ) : (
              'Create Node'
            )}
          </button>
          <button
            className={styles.cancelButton}
            onClick={handleCancel}
            disabled={loading}
          >
            Cancel
          </button>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default CreateNodePage;
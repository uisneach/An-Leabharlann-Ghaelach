import React, { useState } from 'react';
import styles from '@/public/styles/labeleditor.module.css';

interface LabelsEditorProps {
  labels: string[];
  onLabelsChange: (labels: string[]) => void;
}

/**
 * Component for editing node labels
 */
const LabelsEditor: React.FC<LabelsEditorProps> = ({
  labels,
  onLabelsChange
}) => {
  const [newLabelInput, setNewLabelInput] = useState<string>('');

  const handleLabelChange = (index: number, newValue: string) => {
    const newLabels = [...labels];
    newLabels[index] = newValue;
    onLabelsChange(newLabels);
  };

  const handleRemoveLabel = (index: number) => {
    onLabelsChange(labels.filter((_, i) => i !== index));
  };

  const handleAddLabel = () => {
    if (!newLabelInput.trim()) return;
    
    onLabelsChange([...labels, newLabelInput.trim()]);
    setNewLabelInput('');
  };

  return (
    <div className="mb-4" className={styles.labelsContainer}>
      <h2 className="h5 mb-3" style={{ marginTop: '2rem' }}>Edit Labels</h2>
      <ul className="list-unstyled" id="labelsList">
        {labels.map((label, idx) => (
          <li key={idx} className={`mb-2 ${styles.labelItem}`}>
            <input 
              type="text" 
              className={`${styles.formControl} d-inline-block w-auto me-2 ${styles.labelInput}`}
              value={label}
              onChange={(e) => handleLabelChange(idx, e.target.value)}
            />
            <button 
              className="btn btn-sm btn-danger remove-label"
              onClick={() => handleRemoveLabel(idx)}>
              Remove
            </button>
          </li>
        ))}
        
        {/* Add new label input row */}
        <li className="mb-2">
          <input 
            type="text" 
            className={`${styles.formControl} d-inline-block w-auto me-2 ${styles.labelInput}`}
            value={newLabelInput}
            onChange={(e) => setNewLabelInput(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleAddLabel();
              }
            }}
            placeholder="Enter new label..."
          />
          <button 
            className="btn btn-sm btn-secondary"
            onClick={handleAddLabel}>
            Add Label
          </button>
        </li>
      </ul>
    </div>
  );
};

export default LabelsEditor;
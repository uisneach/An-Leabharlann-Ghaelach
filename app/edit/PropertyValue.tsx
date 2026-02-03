import React, { useState, useEffect } from 'react';

// Properties that should use textarea instead of input
const LONG_TEXT_PROPERTIES = ['description', 'contents', 'summary'];

interface PropertyValueProps {
  propertyKey: string;
  value: any;
  onChange: (newValue: any) => void;
}

/**
 * Component for editing a single property value
 * Handles both primitive values and arrays
 */
export const PropertyValue: React.FC<PropertyValueProps> = ({ 
  propertyKey, 
  value, 
  onChange 
}) => {
  const isLongText = LONG_TEXT_PROPERTIES.includes(propertyKey);
  const isArray = Array.isArray(value);
  const [arrayValues, setArrayValues] = useState<string[]>(
    isArray ? value.map(String) : []
  );
  const [singleValue, setSingleValue] = useState<string>(
    !isArray ? String(value || '') : ''
  );

  // Sync changes back to parent
  useEffect(() => {
    if (isArray) {
      onChange(arrayValues.filter(v => v.trim() !== ''));
    } else {
      onChange(singleValue);
    }
  }, [arrayValues, singleValue]);

  const handleAddArrayItem = () => {
    setArrayValues([...arrayValues, '']);
  };

  const handleRemoveArrayItem = (index: number) => {
    setArrayValues(arrayValues.filter((_, i) => i !== index));
  };

  const handleArrayItemChange = (index: number, newValue: string) => {
    const updated = [...arrayValues];
    updated[index] = newValue;
    setArrayValues(updated);
  };

  const toggleArrayMode = () => {
    if (isArray) {
      // Convert to single value (take first item or empty string)
      const firstValue = arrayValues[0] || '';
      setSingleValue(firstValue);
      onChange(firstValue);
    } else {
      // Convert to array
      const newArray = singleValue.trim() ? [singleValue] : [];
      setArrayValues(newArray);
      onChange(newArray);
    }
  };

  if (isArray) {
    return (
      <div className="w-100">
        {arrayValues.map((item, idx) => (
          <div key={idx} className="mb-2 d-flex gap-1 align-items-start property-list-item">
            {isLongText ? (
              <textarea
                className="form-control flex-grow-1"
                rows={3}
                value={item}
                onChange={(e) => handleArrayItemChange(idx, e.target.value)}
                placeholder={`Item ${idx + 1}`}
              />
            ) : (
              <input
                type="text"
                className="form-control flex-grow-1"
                value={item}
                onChange={(e) => handleArrayItemChange(idx, e.target.value)}
                placeholder={`Item ${idx + 1}`}
              />
            )}
            <button
              className="btn btn-sm btn-danger"
              onClick={() => handleRemoveArrayItem(idx)}
              title="Remove this item"
              style={{ minWidth: '32px' }}
            >
              ✕
            </button>
          </div>
        ))}
        <div className="d-flex gap-1 mt-2 flex-wrap">
          <button
            className="btn btn-sm btn-secondary"
            onClick={handleAddArrayItem}>
            + Add Item
          </button>
          <button
            className="btn btn-sm btn-outline-secondary convert-to-single"
            onClick={toggleArrayMode}
            title="Convert to single value">
            Single Value
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-100">
      {isLongText ? (
        <textarea
          className="form-control w-100"
          rows={6}
          value={singleValue}
          onChange={(e) => setSingleValue(e.target.value)}
          placeholder={`Enter ${propertyKey}`}/>
      ) : (
        <input
          type="text"
          className="form-control w-100"
          value={singleValue}
          onChange={(e) => setSingleValue(e.target.value)}
          placeholder={`Enter ${propertyKey}`}/>
      )}
    <button
      className="btn btn-sm btn-outline-secondary convert-to-list"
      onClick={toggleArrayMode}
      title="Convert to list">
      Convert to List
    </button>
    </div>
  );
};
import React from 'react';
import { PropertyValue } from './PropertyValue';

// Reserved properties that cannot be edited
const RESERVED_PROPERTIES = ['nodeId', 'createdBy'];

interface PropertiesTableProps {
  properties: Record<string, any>;
  onPropertiesChange: (properties: Record<string, any>) => void;
  onPropertyDelete: (key: string) => void;
  onSave: () => void;
  onCancel: () => void;
}

/**
 * Component for editing node properties in a table format
 */
const PropertiesTable: React.FC<PropertiesTableProps> = ({
  properties,
  onPropertiesChange
}) => {
  const handlePropertyKeyChange = (oldKey: string, newKey: string) => {
    if (oldKey === newKey) return;
    
    const newProps = { ...properties };
    const value = newProps[oldKey];
    delete newProps[oldKey];
    newProps[newKey] = value;
    onPropertiesChange(newProps);
  };

  const handlePropertyValueChange = (key: string, newValue: any) => {
    onPropertiesChange({
      ...properties,
      [key]: newValue
    });
  };

  const handleAddProperty = () => {
    onPropertiesChange({
      ...properties,
      '': ''
    });
  };

  const handleDeleteProperty = (key: string) => {
	  const updatedProperties = { ...properties };
	  // Remove the desired key
	  delete updatedProperties[key];
	  onPropertiesChange(updatedProperties);
  };

  return (
    <div className="mb-4" id="properties-container">
      <h3 className="h5 mb-3" id="properties-title">Edit Properties</h3>
      <div className="mb-3">
        <small className="text-muted">
          Tip: Properties can be single values or lists. Use "Convert to List" to store multiple values for a property.
        </small>
      </div>
      
      <div className="table-responsive">
        <table className="table table-bordered">
          <thead>
            <tr>
              <th style={{ width: '25%' }}>Property</th>
              <th style={{ width: '65%' }}>Value</th>
              <th style={{ width: '10%' }}></th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(properties)
              .filter(([key]) => !RESERVED_PROPERTIES.includes(key))
              .map(([key, value]) => (
                <tr key={key}>
                  <td className="align-top">
                    <input 
                      type="text" 
                      className="form-control" 
                      value={key}
                      onChange={(e) => handlePropertyKeyChange(key, e.target.value)}
                    />
                  </td>
                  <td>
                    <PropertyValue 
                      propertyKey={key} 
                      value={value}
                      onChange={(newValue) => handlePropertyValueChange(key, newValue)}
                    />
                  </td>
                  <td className="align-top text-center">
                    <button 
                      className="btn btn-sm btn-danger"
                      onClick={() => handleDeleteProperty(key)}
                      title="Delete this property">
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      
      <div className="d-flex gap-2 mt-3">
        <button 
          className="btn btn-secondary"
          onClick={handleAddProperty}
        >
          + Add New Property
        </button>
      </div>
    </div>
  );
};

export default PropertiesTable;
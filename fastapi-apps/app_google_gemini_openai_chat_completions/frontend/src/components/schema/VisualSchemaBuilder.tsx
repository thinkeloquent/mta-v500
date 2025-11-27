import type { SchemaState, SchemaField } from './SchemaBuilder';
import './VisualSchemaBuilder.css';

interface VisualSchemaBuilderProps {
  schema: SchemaState;
  onSchemaChange: (schema: SchemaState) => void;
}

export function VisualSchemaBuilder({ schema, onSchemaChange }: VisualSchemaBuilderProps) {
  const handleNameChange = (name: string) => {
    onSchemaChange({ ...schema, name });
  };

  const handleAddField = () => {
    const newField: SchemaField = {
      id: `field-${Date.now()}`,
      name: '',
      type: 'string',
      description: '',
      required: false,
    };
    onSchemaChange({ ...schema, fields: [...schema.fields, newField] });
  };

  const handleFieldChange = (id: string, updates: Partial<SchemaField>) => {
    onSchemaChange({
      ...schema,
      fields: schema.fields.map((f) => (f.id === id ? { ...f, ...updates } : f)),
    });
  };

  const handleRemoveField = (id: string) => {
    onSchemaChange({
      ...schema,
      fields: schema.fields.filter((f) => f.id !== id),
    });
  };

  return (
    <div className="visual-schema-builder">
      <div className="schema-name-input">
        <label htmlFor="schema-name">Schema Name</label>
        <input
          id="schema-name"
          type="text"
          value={schema.name}
          onChange={(e) => handleNameChange(e.target.value)}
          placeholder="e.g., ContactInfo, ProductDetails"
        />
      </div>

      <div className="schema-fields">
        <div className="schema-fields-header">
          <h4>Fields</h4>
          <button className="add-field-btn" onClick={handleAddField}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <line x1="12" y1="5" x2="12" y2="19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <line x1="5" y1="12" x2="19" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            Add Field
          </button>
        </div>

        {schema.fields.length === 0 ? (
          <div className="schema-fields-empty">
            <p>No fields defined yet.</p>
            <p>Click "Add Field" to start building your schema.</p>
          </div>
        ) : (
          <div className="schema-fields-list">
            {schema.fields.map((field) => (
              <div key={field.id} className="schema-field">
                <div className="schema-field-row">
                  <div className="schema-field-input">
                    <label>Name</label>
                    <input
                      type="text"
                      value={field.name}
                      onChange={(e) => handleFieldChange(field.id, { name: e.target.value })}
                      placeholder="field_name"
                    />
                  </div>

                  <div className="schema-field-input schema-field-type">
                    <label>Type</label>
                    <select
                      value={field.type}
                      onChange={(e) =>
                        handleFieldChange(field.id, {
                          type: e.target.value as SchemaField['type'],
                        })
                      }
                    >
                      <option value="string">String</option>
                      <option value="number">Number</option>
                      <option value="boolean">Boolean</option>
                      <option value="array">Array</option>
                      <option value="object">Object</option>
                    </select>
                  </div>

                  <div className="schema-field-checkbox">
                    <label>
                      <input
                        type="checkbox"
                        checked={field.required}
                        onChange={(e) =>
                          handleFieldChange(field.id, { required: e.target.checked })
                        }
                      />
                      Required
                    </label>
                  </div>

                  <button
                    className="schema-field-remove"
                    onClick={() => handleRemoveField(field.id)}
                    title="Remove field"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  </button>
                </div>

                <div className="schema-field-description">
                  <label>Description</label>
                  <input
                    type="text"
                    value={field.description}
                    onChange={(e) =>
                      handleFieldChange(field.id, { description: e.target.value })
                    }
                    placeholder="Brief description of this field"
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

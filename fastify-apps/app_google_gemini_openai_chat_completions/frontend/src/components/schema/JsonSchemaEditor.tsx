import './JsonSchemaEditor.css';

interface JsonSchemaEditorProps {
  value: string;
  onChange: (value: string) => void;
  error?: string | null;
}

export function JsonSchemaEditor({ value, onChange, error }: JsonSchemaEditorProps) {
  const handleFormat = () => {
    try {
      const parsed = JSON.parse(value);
      onChange(JSON.stringify(parsed, null, 2));
    } catch {
      // Can't format invalid JSON
    }
  };

  return (
    <div className="json-schema-editor">
      <div className="json-editor-header">
        <span className="json-editor-label">JSON Schema</span>
        <button className="json-format-btn" onClick={handleFormat} title="Format JSON">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M4 6h16M4 12h10M4 18h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          Format
        </button>
      </div>

      <div className="json-editor-wrapper">
        <textarea
          className={`json-editor-textarea ${error ? 'json-editor-textarea--error' : ''}`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={`{
  "name": "MySchema",
  "properties": {
    "field_name": {
      "type": "string",
      "description": "Field description"
    }
  },
  "required": ["field_name"]
}`}
          spellCheck={false}
        />
      </div>

      {error && (
        <div className="json-editor-error">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
            <line x1="12" y1="8" x2="12" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <line x1="12" y1="16" x2="12.01" y2="16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      <div className="json-editor-hint">
        <p>
          <strong>Required fields:</strong> <code>name</code> (schema name) and <code>properties</code> (field definitions)
        </p>
        <p>
          <strong>Supported types:</strong> string, number, boolean, array, object
        </p>
      </div>
    </div>
  );
}

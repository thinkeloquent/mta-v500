import { useState, useEffect } from 'react';
import { VisualSchemaBuilder } from './VisualSchemaBuilder';
import { JsonSchemaEditor } from './JsonSchemaEditor';
import { TemplateSelector } from './TemplateSelector';
import { ExampleSelector } from './ExampleSelector';
import type { SchemaTemplate } from '../../constants/templates';
import './SchemaBuilder.css';

export interface SchemaField {
  id: string;
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description: string;
  required: boolean;
}

export interface SchemaState {
  name: string;
  fields: SchemaField[];
}

interface SchemaBuilderProps {
  schema: SchemaState;
  onSchemaChange: (schema: SchemaState) => void;
  onExampleSelect?: (example: string) => void;
  error?: string | null;
}

export function SchemaBuilder({ schema, onSchemaChange, onExampleSelect, error }: SchemaBuilderProps) {
  const [mode, setMode] = useState<'visual' | 'json'>('visual');
  const [jsonValue, setJsonValue] = useState('');
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [lastSelectedTemplate, setLastSelectedTemplate] = useState<SchemaTemplate | null>(null);

  // Sync visual to JSON when switching to JSON mode
  useEffect(() => {
    if (mode === 'json') {
      setJsonValue(visualToJson(schema));
      setJsonError(null);
    }
  }, [mode]);

  const handleTemplateSelect = (template: SchemaTemplate) => {
    const fields: SchemaField[] = Object.entries(template.schema.properties).map(
      ([name, prop]: [string, any], index) => ({
        id: `field-${Date.now()}-${index}`,
        name,
        type: prop.type || 'string',
        description: prop.description || '',
        required: template.schema.required?.includes(name) || false,
      })
    );

    onSchemaChange({
      name: template.schema.name,
      fields,
    });
    setLastSelectedTemplate(template);
  };

  const handleExampleSelect = (prompt: string) => {
    if (onExampleSelect) {
      onExampleSelect(prompt);
    }
  };

  const handleJsonChange = (value: string) => {
    setJsonValue(value);
    setJsonError(null);

    try {
      const parsed = JSON.parse(value);
      if (!parsed.name || !parsed.properties) {
        setJsonError('JSON must include "name" and "properties"');
        return;
      }

      const fields: SchemaField[] = Object.entries(parsed.properties).map(
        ([name, prop]: [string, any], index) => ({
          id: `field-${Date.now()}-${index}`,
          name,
          type: prop.type || 'string',
          description: prop.description || '',
          required: parsed.required?.includes(name) || false,
        })
      );

      onSchemaChange({
        name: parsed.name,
        fields,
      });
    } catch {
      setJsonError('Invalid JSON syntax');
    }
  };

  const handleModeSwitch = (newMode: 'visual' | 'json') => {
    if (newMode === 'json' && mode === 'visual') {
      setJsonValue(visualToJson(schema));
      setJsonError(null);
    }
    setMode(newMode);
  };

  return (
    <div className="schema-builder">
      <div className="schema-builder-header">
        <div className="schema-builder-actions">
          <TemplateSelector onSelect={handleTemplateSelect} />
          {lastSelectedTemplate && onExampleSelect && (
            <ExampleSelector
              examples={lastSelectedTemplate.examples}
              onSelect={handleExampleSelect}
            />
          )}
        </div>
        <div className="schema-builder-mode-toggle">
          <button
            className={`mode-btn ${mode === 'visual' ? 'mode-btn--active' : ''}`}
            onClick={() => handleModeSwitch('visual')}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2" />
              <rect x="14" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2" />
              <rect x="3" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2" />
              <rect x="14" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2" />
            </svg>
            Visual
          </button>
          <button
            className={`mode-btn ${mode === 'json' ? 'mode-btn--active' : ''}`}
            onClick={() => handleModeSwitch('json')}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <polyline points="16 18 22 12 16 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <polyline points="8 6 2 12 8 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            JSON
          </button>
        </div>
      </div>

      {error && (
        <div className="schema-builder-error">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
            <line x1="12" y1="8" x2="12" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <line x1="12" y1="16" x2="12.01" y2="16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      <div className="schema-builder-content">
        {mode === 'visual' ? (
          <VisualSchemaBuilder schema={schema} onSchemaChange={onSchemaChange} />
        ) : (
          <JsonSchemaEditor
            value={jsonValue}
            onChange={handleJsonChange}
            error={jsonError}
          />
        )}
      </div>
    </div>
  );
}

function visualToJson(schema: SchemaState): string {
  const properties: Record<string, unknown> = {};
  const required: string[] = [];

  schema.fields.forEach((field) => {
    properties[field.name] = {
      type: field.type,
      description: field.description,
    };
    if (field.required) {
      required.push(field.name);
    }
  });

  return JSON.stringify(
    {
      name: schema.name || 'Schema',
      properties,
      required: required.length > 0 ? required : undefined,
    },
    null,
    2
  );
}

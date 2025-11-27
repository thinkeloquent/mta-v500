import { useState, useRef, useEffect } from 'react';
import { SCHEMA_TEMPLATES, type SchemaTemplate } from '../../constants/templates';
import './TemplateSelector.css';

interface TemplateSelectorProps {
  onSelect: (template: SchemaTemplate) => void;
}

export function TemplateSelector({ onSelect }: TemplateSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (template: SchemaTemplate) => {
    onSelect(template);
    setIsOpen(false);
  };

  return (
    <div className="template-selector" ref={dropdownRef}>
      <button
        className="template-selector-trigger"
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2" />
          <line x1="9" y1="3" x2="9" y2="21" stroke="currentColor" strokeWidth="2" />
          <line x1="3" y1="9" x2="9" y2="9" stroke="currentColor" strokeWidth="2" />
          <line x1="3" y1="15" x2="9" y2="15" stroke="currentColor" strokeWidth="2" />
        </svg>
        Use Template
        <svg className="chevron" width="14" height="14" viewBox="0 0 24 24" fill="none">
          <polyline points="6 9 12 15 18 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {isOpen && (
        <div className="template-selector-dropdown" role="listbox">
          {SCHEMA_TEMPLATES.map((template) => (
            <button
              key={template.id}
              className="template-option"
              onClick={() => handleSelect(template)}
              role="option"
            >
              <div className="template-option-name">{template.name}</div>
              <div className="template-option-description">{template.description}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

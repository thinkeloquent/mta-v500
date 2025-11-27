import { useState, useRef, useEffect } from 'react';
import type { ExamplePrompt } from '../../constants/templates';
import './ExampleSelector.css';

interface ExampleSelectorProps {
  examples: ExamplePrompt[];
  onSelect: (prompt: string) => void;
}

export function ExampleSelector({ examples, onSelect }: ExampleSelectorProps) {
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

  const handleSelect = (example: ExamplePrompt) => {
    onSelect(example.prompt);
    setIsOpen(false);
  };

  return (
    <div className="example-selector" ref={dropdownRef}>
      <button
        className="example-selector-trigger"
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <path d="M12 20h9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Use Example
        <svg className="chevron" width="14" height="14" viewBox="0 0 24 24" fill="none">
          <polyline points="6 9 12 15 18 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {isOpen && (
        <div className="example-selector-dropdown" role="listbox">
          {examples.map((example) => (
            <button
              key={example.id}
              className="example-option"
              onClick={() => handleSelect(example)}
              role="option"
            >
              <div className="example-option-label">{example.label}</div>
              <div className="example-option-preview">{example.prompt.slice(0, 60)}...</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

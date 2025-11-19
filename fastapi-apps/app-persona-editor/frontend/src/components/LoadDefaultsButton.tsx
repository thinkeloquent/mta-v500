import { ChevronDown, Download } from 'lucide-react';
import type React from 'react';
import { useEffect, useState } from 'react';
import { llmDefaultsAPI } from '../api';
import type { LLMDefault, LLMDefaultCategory } from '../types';

interface LoadDefaultsButtonProps {
  category: LLMDefaultCategory;
  onLoadDefault: (value: any) => void;
  label?: string;
}

const LoadDefaultsButton: React.FC<LoadDefaultsButtonProps> = ({
  category,
  onLoadDefault,
  label = 'Load Default',
}) => {
  const [defaults, setDefaults] = useState<LLMDefault[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchDefaults = async () => {
      try {
        setLoading(true);
        const data = await llmDefaultsAPI.getByCategory(category);
        setDefaults(data);
      } catch (error) {
        console.error('Failed to fetch defaults:', error);
      } finally {
        setLoading(false);
      }
    };

    if (isOpen) {
      fetchDefaults();
    }
  }, [category, isOpen]);

  const handleSelectDefault = (defaultItem: LLMDefault) => {
    onLoadDefault(defaultItem.value);
    setIsOpen(false);
  };

  if (defaults.length === 0 && !loading) {
    return null; // Don't show button if no defaults available
  }

  return (
    <div className="relative inline-block">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1 text-sm bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
      >
        <Download className="w-3 h-3" />
        {label}
        <ChevronDown className="w-3 h-3" />
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />

          {/* Dropdown */}
          <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-20">
            {loading ? (
              <div className="p-3 text-sm text-gray-600 text-center">Loading...</div>
            ) : defaults.length === 0 ? (
              <div className="p-3 text-sm text-gray-600 text-center">No defaults available</div>
            ) : (
              <div className="max-h-64 overflow-y-auto">
                {defaults.map((defaultItem) => (
                  <button
                    key={defaultItem.id}
                    onClick={() => handleSelectDefault(defaultItem)}
                    className="w-full text-left px-4 py-2 hover:bg-gray-100 transition-colors border-b border-gray-100 last:border-b-0"
                  >
                    <div className="font-medium text-sm text-gray-900">
                      {defaultItem.name}
                      {defaultItem.is_default && (
                        <span className="ml-2 text-xs text-yellow-600">(Default)</span>
                      )}
                    </div>
                    <div className="text-xs text-gray-600 mt-0.5">{defaultItem.description}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default LoadDefaultsButton;

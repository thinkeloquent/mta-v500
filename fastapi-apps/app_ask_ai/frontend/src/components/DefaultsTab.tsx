import { Edit3, Plus, Star, StarOff, Trash2 } from 'lucide-react';
import type React from 'react';
import { useState } from 'react';
import type { LLMDefault, LLMDefaultCategory } from '../types';

interface DefaultsTabProps {
  category: LLMDefaultCategory;
  defaults: LLMDefault[];
  onCreateDefault: (defaultItem: Omit<LLMDefault, 'id' | 'created_at' | 'updated_at'>) => void;
  onUpdateDefault: (
    id: string,
    data: Partial<Omit<LLMDefault, 'id' | 'created_at' | 'updated_at'>>,
  ) => void;
  onDeleteDefault: (id: string) => void;
}

const DefaultsTab: React.FC<DefaultsTabProps> = ({
  category,
  defaults,
  onCreateDefault,
  onUpdateDefault,
  onDeleteDefault,
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    value: '',
    is_default: false,
  });

  const handleCreateClick = () => {
    setIsCreating(true);
    setFormData({ name: '', description: '', value: '', is_default: false });
  };

  const handleEditClick = (defaultItem: LLMDefault) => {
    setEditingId(defaultItem.id);
    setFormData({
      name: defaultItem.name,
      description: defaultItem.description,
      value: JSON.stringify(defaultItem.value, null, 2),
      is_default: defaultItem.is_default,
    });
  };

  const handleCancel = () => {
    setIsCreating(false);
    setEditingId(null);
    setFormData({ name: '', description: '', value: '', is_default: false });
  };

  const handleSave = () => {
    try {
      const valueData = formData.value.trim() ? JSON.parse(formData.value) : null;

      if (isCreating) {
        onCreateDefault({
          category,
          name: formData.name,
          description: formData.description,
          value: valueData,
          is_default: formData.is_default,
        });
      } else if (editingId) {
        onUpdateDefault(editingId, {
          name: formData.name,
          description: formData.description,
          value: valueData,
          is_default: formData.is_default,
        });
      }
      handleCancel();
    } catch (_error) {
      alert('Invalid JSON in value field');
    }
  };

  const handleToggleDefault = (id: string, currentDefault: boolean) => {
    onUpdateDefault(id, { is_default: !currentDefault });
  };

  const getCategoryLabel = (cat: LLMDefaultCategory): string => {
    const labels: Record<LLMDefaultCategory, string> = {
      tools: 'Tools',
      permissions: 'Permissions',
      goals: 'Goals',
      prompts: 'Prompt Templates',
      tones: 'Tones',
      roles: 'Roles',
    };
    return labels[cat];
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">
          {getCategoryLabel(category)} Defaults
        </h3>
        {!isCreating && !editingId && (
          <button
            onClick={handleCreateClick}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Default
          </button>
        )}
      </div>

      {/* Create/Edit Form */}
      {(isCreating || editingId) && (
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">
            {isCreating ? 'Create New Default' : 'Edit Default'}
          </h4>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                placeholder="Enter default name"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                placeholder="Describe this default configuration"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Value (JSON)</label>
              <textarea
                value={formData.value}
                onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                rows={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 font-mono text-sm"
                placeholder='{"example": "value"}'
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is-default"
                checked={formData.is_default}
                onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
                className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
              />
              <label htmlFor="is-default" className="text-sm text-gray-700">
                Set as default for this category
              </label>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Save
              </button>
              <button
                onClick={handleCancel}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Defaults List */}
      <div className="space-y-3">
        {defaults.length === 0 ? (
          <div className="bg-gray-50 rounded-lg p-8 text-center">
            <p className="text-gray-600">No defaults configured for this category yet</p>
            <p className="text-sm text-gray-500 mt-1">Click "Add Default" to create one</p>
          </div>
        ) : (
          defaults.map((defaultItem) => (
            <div
              key={defaultItem.id}
              className={`bg-white rounded-lg border-2 p-4 transition-all ${
                defaultItem.is_default
                  ? 'border-yellow-400 bg-yellow-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold text-gray-900">{defaultItem.name}</h4>
                    {defaultItem.is_default && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded text-xs font-medium">
                        <Star className="w-3 h-3" />
                        Default
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{defaultItem.description}</p>
                  <div className="bg-gray-100 rounded p-2 mt-2">
                    <pre className="text-xs text-gray-800 overflow-x-auto">
                      {JSON.stringify(defaultItem.value, null, 2)}
                    </pre>
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={() => handleToggleDefault(defaultItem.id, defaultItem.is_default)}
                    className="p-2 text-yellow-600 hover:bg-yellow-50 rounded-lg transition-colors"
                    title={defaultItem.is_default ? 'Unset as default' : 'Set as default'}
                  >
                    {defaultItem.is_default ? (
                      <StarOff className="w-4 h-4" />
                    ) : (
                      <Star className="w-4 h-4" />
                    )}
                  </button>
                  <button
                    onClick={() => handleEditClick(defaultItem)}
                    className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                    title="Edit"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Delete "${defaultItem.name}"?`)) {
                        onDeleteDefault(defaultItem.id);
                      }
                    }}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default DefaultsTab;

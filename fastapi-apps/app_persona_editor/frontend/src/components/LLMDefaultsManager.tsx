import { FileText, MessageSquare, Settings, Shield, Target, User, Wrench } from 'lucide-react';
import type React from 'react';
import { useEffect, useState } from 'react';
import { llmDefaultsAPI } from '../api';
import type { LLMDefault, LLMDefaultCategory } from '../types';
import DefaultsTab from './DefaultsTab';

const CATEGORIES: {
  id: LLMDefaultCategory;
  label: string;
  icon: React.FC<{ className?: string }>;
}[] = [
  { id: 'tools', label: 'Tools', icon: Wrench },
  { id: 'permissions', label: 'Permissions', icon: Shield },
  { id: 'goals', label: 'Goals', icon: Target },
  { id: 'prompts', label: 'Prompt Templates', icon: FileText },
  { id: 'tones', label: 'Tones', icon: MessageSquare },
  { id: 'roles', label: 'Roles', icon: User },
];

const LLMDefaultsManager: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState<LLMDefaultCategory>('tools');
  const [defaults, setDefaults] = useState<LLMDefault[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch all defaults
  const fetchDefaults = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await llmDefaultsAPI.list();
      setDefaults(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch LLM defaults';
      setError(message);
      console.error('Error fetching defaults:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDefaults();
  }, []);

  // Filter defaults by active category
  const categoryDefaults = defaults.filter((d) => d.category === activeCategory);

  // CRUD handlers
  const handleCreateDefault = async (
    defaultItem: Omit<LLMDefault, 'id' | 'created_at' | 'updated_at'>,
  ) => {
    try {
      setError(null);
      await llmDefaultsAPI.create(defaultItem);
      await fetchDefaults();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create default';
      setError(message);
      console.error('Error creating default:', err);
    }
  };

  const handleUpdateDefault = async (
    id: string,
    data: Partial<Omit<LLMDefault, 'id' | 'created_at' | 'updated_at'>>,
  ) => {
    try {
      setError(null);
      await llmDefaultsAPI.update(id, data);
      await fetchDefaults();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update default';
      setError(message);
      console.error('Error updating default:', err);
    }
  };

  const handleDeleteDefault = async (id: string) => {
    try {
      setError(null);
      await llmDefaultsAPI.delete(id);
      await fetchDefaults();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete default';
      setError(message);
      console.error('Error deleting default:', err);
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center text-white">
            <Settings className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">LLM Defaults Manager</h2>
            <p className="text-sm text-gray-600">Configure default values for persona creation</p>
          </div>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            Error: {error}
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Category Tabs - Vertical Sidebar */}
        <div className="w-64 bg-gray-50 border-r border-gray-200 overflow-y-auto">
          <div className="p-4 space-y-1">
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const isActive = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                    isActive ? 'bg-indigo-600 text-white' : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{cat.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-gray-600">Loading defaults...</div>
              </div>
            ) : (
              <DefaultsTab
                category={activeCategory}
                defaults={categoryDefaults}
                onCreateDefault={handleCreateDefault}
                onUpdateDefault={handleUpdateDefault}
                onDeleteDefault={handleDeleteDefault}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LLMDefaultsManager;

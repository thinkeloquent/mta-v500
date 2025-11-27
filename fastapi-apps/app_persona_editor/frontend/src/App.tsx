import { Brain, Edit3, Plus, RefreshCw, Search, Settings, User } from 'lucide-react';
import type React from 'react';
import { useEffect, useState } from 'react';
import { personasAPI } from './api';
import LLMDefaultsManager from './components/LLMDefaultsManager';
import LoadDefaultsButton from './components/LoadDefaultsButton';
import PersonaCard from './components/PersonaCard';
import type { Persona } from './types';

interface AppState {
  personas: Persona[];
  loading: boolean;
  error: string | null;
}

const App: React.FC = () => {
  // View state - 'personas' or 'defaults'
  const [currentView, setCurrentView] = useState<'personas' | 'defaults'>('personas');

  // State management
  const [state, setState] = useState<AppState>({
    personas: [],
    loading: true,
    error: null,
  });

  const [selectedPersona, setSelectedPersona] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editingPersona, setEditingPersona] = useState<Persona | null>(null);
  const [originalPersona, setOriginalPersona] = useState<Persona | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Data fetching functions with defensive programming
  const fetchPersonas = async () => {
    try {
      const data = await personasAPI.list();
      // Validate response is an array
      if (!Array.isArray(data)) {
        throw new Error('Invalid personas data: expected array');
      }
      setState((prev) => ({ ...prev, personas: data, error: null }));
      // Auto-select first persona if none selected
      if (!selectedPersona && data.length > 0) {
        setSelectedPersona(data[0].id);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch personas';
      setState((prev) => ({ ...prev, error: message }));
      console.error('Error fetching personas:', err);
    }
  };

  // Initial data load
  useEffect(() => {
    const loadInitialData = async () => {
      setState((prev) => ({ ...prev, loading: true }));
      await fetchPersonas();
      setState((prev) => ({ ...prev, loading: false }));
    };

    loadInitialData();
  }, []);

  // CRUD Operations
  const handleCreatePersona = () => {
    const newPersona: Partial<Persona> = {
      id: `persona-new-${Date.now()}`,
      name: 'New Persona',
      description: 'Configure this persona',
      role: 'assistant',
      tone: 'neutral',
      goals: [],
      llm_provider: 'gpt-4o',
      llm_temperature: 0.5,
      llm_parameters: {},
      memory: {
        enabled: false,
        scope: 'session',
        storage_id: `memory-persona-${Date.now()}`,
      },
      context_files: [],
      tools: ['web-search'],
      permitted_to: [],
      prompt_system_template: [],
      prompt_user_template: [],
      prompt_context_template: [],
      prompt_instruction: [],
      agent_delegate: [],
      agent_call: [],
      version: '1.0.0',
      last_updated: new Date().toISOString(),
    };

    setSelectedPersona(newPersona.id!);
    setEditingPersona(newPersona as Persona);
    setOriginalPersona(newPersona as Persona);
    setHasUnsavedChanges(false);
    setIsEditing(true);
  };

  const handleSavePersona = async () => {
    if (!editingPersona) return;

    try {
      setState((prev) => ({ ...prev, loading: true }));

      // Check if this is a new persona (temporary ID) or existing one
      const isNewPersona = editingPersona.id.startsWith('persona-new-');

      let savedPersona: Persona;
      if (isNewPersona) {
        // Create new persona (API will assign real ID)
        const { id: _id, last_updated: _lastUpdated, ...createData } = editingPersona;
        savedPersona = await personasAPI.create(createData);
      } else {
        // Update existing persona
        savedPersona = await personasAPI.update(editingPersona.id, editingPersona);
      }

      // Validate saved persona
      if (!savedPersona || !savedPersona.id) {
        throw new Error('Invalid response from save operation');
      }

      // Refresh personas list
      await fetchPersonas();

      // Keep edit panel open, just update the state
      setEditingPersona(savedPersona);
      setOriginalPersona(savedPersona);
      setHasUnsavedChanges(false);
      setSelectedPersona(savedPersona.id);
      setState((prev) => ({ ...prev, loading: false, error: null }));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save persona';
      setState((prev) => ({ ...prev, error: message, loading: false }));
      console.error('Error saving persona:', err);
    }
  };

  const handleDeletePersona = async (personaId: string) => {
    if (!confirm('Are you sure you want to delete this persona?')) return;

    try {
      setState((prev) => ({ ...prev, loading: true }));
      await personasAPI.delete(personaId);

      // Refresh personas list
      await fetchPersonas();

      // Reset selection if deleted persona was selected
      if (selectedPersona === personaId) {
        const remainingPersonas = state.personas.filter((p) => p.id !== personaId);
        setSelectedPersona(remainingPersonas[0]?.id || null);
      }

      setState((prev) => ({ ...prev, loading: false, error: null }));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete persona';
      setState((prev) => ({ ...prev, error: message, loading: false }));
      console.error('Error deleting persona:', err);
    }
  };

  const handleExportPersona = (persona: Persona) => {
    const dataStr = JSON.stringify(persona, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `persona-${persona.id}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Get current data
  const currentPersona = state.personas.find((p) => p.id === selectedPersona);

  // Filter personas
  const filteredPersonas = state.personas.filter((persona) => {
    const matchesSearch =
      persona.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      persona.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50 flex flex-col">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center text-white">
                <Brain className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  Persona Architect
                </h1>
                <p className="text-xs text-gray-600">AI Agent Configuration & Monitoring</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Navigation Tabs */}
              <div className="flex gap-2 mr-4">
                <button
                  onClick={() => setCurrentView('personas')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                    currentView === 'personas'
                      ? 'bg-indigo-600 text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <User className="w-4 h-4" />
                  Personas
                </button>
                <button
                  onClick={() => setCurrentView('defaults')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                    currentView === 'defaults'
                      ? 'bg-indigo-600 text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Settings className="w-4 h-4" />
                  LLM Defaults
                </button>
              </div>

              {currentView === 'personas' && (
                <>
                  <button
                    onClick={() => fetchPersonas()}
                    disabled={state.loading}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                    title="Refresh data"
                  >
                    <RefreshCw
                      className={`w-5 h-5 text-gray-600 ${state.loading ? 'animate-spin' : ''}`}
                    />
                  </button>
                  <button
                    onClick={handleCreatePersona}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    New Persona
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Error Banner */}
          {state.error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              Error: {state.error}
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      {currentView === 'defaults' ? (
        <div className="flex-1 overflow-hidden">
          <LLMDefaultsManager />
        </div>
      ) : (
        <div className="max-w-7xl mx-auto px-4 py-6 flex-1">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Sidebar - Persona List */}
            <div className="lg:col-span-1">
              {/* Search and Filter */}
              <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search personas..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Persona Cards */}
              <div className="space-y-4">
                {state.loading && state.personas.length === 0 ? (
                  <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
                    <RefreshCw className="w-8 h-8 text-gray-400 mx-auto mb-2 animate-spin" />
                    <p className="text-gray-600">Loading personas...</p>
                  </div>
                ) : filteredPersonas.length > 0 ? (
                  filteredPersonas.map((persona) => (
                    <PersonaCard
                      key={persona.id}
                      persona={persona}
                      isSelected={selectedPersona === persona.id}
                      onSelect={setSelectedPersona}
                      onEdit={(p) => {
                        setEditingPersona(p);
                        setOriginalPersona(p);
                        setHasUnsavedChanges(false);
                        setIsEditing(true);
                      }}
                      onDelete={handleDeletePersona}
                      onExport={handleExportPersona}
                    />
                  ))
                ) : (
                  <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
                    <User className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-600">No personas found</p>
                  </div>
                )}
              </div>
            </div>

            {/* Right Content Area */}
            <div className="lg:col-span-2">
              {currentPersona || isEditing ? (
                <>
                  {/* Content */}
                  <div
                    className={`rounded-xl border border-gray-200 p-6 ${
                      isEditing && editingPersona?.id.startsWith('persona-new-')
                        ? 'bg-green-50'
                        : 'bg-white'
                    }`}
                  >
                    {/* Definition View/Edit */}
                    <DefinitionTab
                      persona={currentPersona}
                      isEditing={isEditing}
                      editingPersona={editingPersona}
                      hasUnsavedChanges={hasUnsavedChanges}
                      onEdit={() => {
                        setEditingPersona(currentPersona || null);
                        setOriginalPersona(currentPersona || null);
                        setHasUnsavedChanges(false);
                        setIsEditing(true);
                      }}
                      onCancel={() => {
                        setIsEditing(false);
                        setEditingPersona(null);
                        setOriginalPersona(null);
                        setHasUnsavedChanges(false);
                      }}
                      onRevert={() => {
                        setEditingPersona(originalPersona);
                        setHasUnsavedChanges(false);
                      }}
                      onSave={handleSavePersona}
                      onUpdate={(persona) => {
                        setEditingPersona(persona);
                        setHasUnsavedChanges(true);
                      }}
                    />
                  </div>
                </>
              ) : (
                <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                  <User className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">No Persona Selected</h3>
                  <p className="text-gray-600 mb-6">Create or select a persona to get started</p>
                  <button
                    onClick={handleCreatePersona}
                    className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                  >
                    Create New Persona
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Definition Tab Component
interface DefinitionTabProps {
  persona: Persona | undefined;
  isEditing: boolean;
  editingPersona: Persona | null;
  hasUnsavedChanges: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onRevert: () => void;
  onSave: () => void;
  onUpdate: (persona: Persona) => void;
}

const DefinitionTab: React.FC<DefinitionTabProps> = ({
  persona,
  isEditing,
  editingPersona,
  hasUnsavedChanges,
  onEdit,
  onCancel,
  onRevert,
  onSave,
  onUpdate,
}) => {
  if (isEditing && editingPersona) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">
            {editingPersona.id.startsWith('persona-new-') ? 'Create New Persona' : 'Edit Persona'}
          </h2>
          <div className="flex items-center gap-2">
            {hasUnsavedChanges ? (
              <button
                onClick={onRevert}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Revert
              </button>
            ) : (
              <button
                onClick={onCancel}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
            )}
            <button
              onClick={onSave}
              disabled={!hasUnsavedChanges}
              className={`px-4 py-2 rounded-lg transition-colors ${
                hasUnsavedChanges
                  ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                  : 'bg-gray-300 text-gray-600 cursor-not-allowed'
              }`}
            >
              {hasUnsavedChanges ? 'Apply Changes' : 'Saved'}
            </button>
          </div>
        </div>

        <div className="space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Name</label>
              <input
                type="text"
                value={editingPersona.name || ''}
                onChange={(e) => onUpdate({ ...editingPersona, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                placeholder="Enter persona name"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Role</label>
              <select
                value={editingPersona.role || 'assistant'}
                onChange={(e) =>
                  onUpdate({ ...editingPersona, role: e.target.value as Persona['role'] })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              >
                <option value="assistant">Assistant</option>
                <option value="architect">Architect</option>
                <option value="developer">Developer</option>
                <option value="analyst">Analyst</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Description</label>
            <textarea
              value={editingPersona.description || ''}
              onChange={(e) => onUpdate({ ...editingPersona, description: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              placeholder="Describe the persona's purpose and capabilities"
            />
          </div>

          {/* Model Configuration */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">LLM Provider</label>
              <input
                type="text"
                value={editingPersona.llm_provider || ''}
                onChange={(e) => onUpdate({ ...editingPersona, llm_provider: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                placeholder="e.g., gpt-4o, claude-opus-4"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Tone</label>
              <select
                value={editingPersona.tone || 'neutral'}
                onChange={(e) =>
                  onUpdate({ ...editingPersona, tone: e.target.value as Persona['tone'] })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              >
                <option value="neutral">Neutral</option>
                <option value="analytical">Analytical</option>
                <option value="friendly">Friendly</option>
                <option value="professional">Professional</option>
                <option value="casual">Casual</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">
              LLM Temperature: {editingPersona.llm_temperature ?? 0.5}
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={editingPersona.llm_temperature ?? 0.5}
              onChange={(e) =>
                onUpdate({ ...editingPersona, llm_temperature: parseFloat(e.target.value) })
              }
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>Deterministic</span>
              <span>Creative</span>
            </div>
          </div>

          {/* LLM Parameters */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">LLM Parameters</label>
            <div className="space-y-2">
              {Object.entries(editingPersona.llm_parameters || {}).map(([key, value], idx) => (
                <div key={idx} className="grid grid-cols-3 gap-2">
                  <input
                    type="text"
                    value={key}
                    onChange={(e) => {
                      const newParams = { ...(editingPersona.llm_parameters || {}) };
                      delete newParams[key];
                      newParams[e.target.value] = value;
                      onUpdate({ ...editingPersona, llm_parameters: newParams });
                    }}
                    className="px-3 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    placeholder="Key"
                  />
                  <input
                    type="text"
                    value={value}
                    onChange={(e) => {
                      const newParams = { ...(editingPersona.llm_parameters || {}) };
                      newParams[key] = e.target.value;
                      onUpdate({ ...editingPersona, llm_parameters: newParams });
                    }}
                    className="px-3 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    placeholder="Value"
                  />
                  <button
                    onClick={() => {
                      const newParams = { ...(editingPersona.llm_parameters || {}) };
                      delete newParams[key];
                      onUpdate({ ...editingPersona, llm_parameters: newParams });
                    }}
                    className="p-1 text-red-500 hover:bg-red-50 rounded-lg"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>
              ))}
              <button
                onClick={() => {
                  const newParams = { ...(editingPersona.llm_parameters || {}), '': '' };
                  onUpdate({ ...editingPersona, llm_parameters: newParams });
                }}
                className="text-indigo-600 hover:text-indigo-700 text-sm font-medium flex items-center gap-1"
              >
                <Plus className="w-4 h-4" /> Add Parameter
              </button>
            </div>
          </div>

          {/* Goals */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-sm font-medium text-gray-700">Goals</label>
              <LoadDefaultsButton
                category="goals"
                onLoadDefault={(value) => {
                  if (Array.isArray(value)) {
                    onUpdate({ ...editingPersona, goals: value });
                  }
                }}
              />
            </div>
            <div className="space-y-2">
              {(editingPersona.goals || []).map((goal, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={goal}
                    onChange={(e) => {
                      const newGoals = [...(editingPersona.goals || [])];
                      newGoals[idx] = e.target.value;
                      onUpdate({ ...editingPersona, goals: newGoals });
                    }}
                    className="flex-1 px-3 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    placeholder="Enter goal"
                  />
                  <button
                    onClick={() => {
                      const newGoals = editingPersona.goals.filter((_, i) => i !== idx);
                      onUpdate({ ...editingPersona, goals: newGoals });
                    }}
                    className="p-1 text-red-500 hover:bg-red-50 rounded-lg"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>
              ))}
              <button
                onClick={() => {
                  onUpdate({ ...editingPersona, goals: [...(editingPersona.goals || []), ''] });
                }}
                className="text-indigo-600 hover:text-indigo-700 text-sm font-medium flex items-center gap-1"
              >
                <Plus className="w-4 h-4" /> Add Goal
              </button>
            </div>
          </div>

          {/* Tools */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-sm font-medium text-gray-700">Tools</label>
              <LoadDefaultsButton
                category="tools"
                onLoadDefault={(value) => {
                  if (Array.isArray(value)) {
                    onUpdate({ ...editingPersona, tools: value as any });
                  }
                }}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {['web-search', 'code-gen', 'analysis-engine', 'debugger', 'test-runner'].map(
                (tool) => (
                  <button
                    key={tool}
                    onClick={() => {
                      const currentTools = editingPersona.tools || [];
                      if (currentTools.includes(tool as any)) {
                        onUpdate({
                          ...editingPersona,
                          tools: currentTools.filter((t) => t !== tool),
                        });
                      } else {
                        onUpdate({ ...editingPersona, tools: [...currentTools, tool as any] });
                      }
                    }}
                    className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                      (editingPersona.tools || []).includes(tool as any)
                        ? 'bg-green-100 text-green-700 border-2 border-green-300'
                        : 'bg-gray-100 text-gray-600 border-2 border-gray-200 hover:bg-gray-200'
                    }`}
                  >
                    {tool}
                  </button>
                ),
              )}
            </div>
          </div>

          {/* Permitted To */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-sm font-medium text-gray-700">Permitted To</label>
              <LoadDefaultsButton
                category="permissions"
                onLoadDefault={(value) => {
                  if (Array.isArray(value)) {
                    onUpdate({ ...editingPersona, permitted_to: value as any });
                  }
                }}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {['read_repo', 'write_code', 'run_test', 'generate_report', 'access_docs'].map(
                (perm) => (
                  <button
                    key={perm}
                    onClick={() => {
                      const currentPerms = editingPersona.permitted_to || [];
                      if (currentPerms.includes(perm as any)) {
                        onUpdate({
                          ...editingPersona,
                          permitted_to: currentPerms.filter((p) => p !== perm),
                        });
                      } else {
                        onUpdate({
                          ...editingPersona,
                          permitted_to: [...currentPerms, perm as any],
                        });
                      }
                    }}
                    className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                      (editingPersona.permitted_to || []).includes(perm as any)
                        ? 'bg-purple-100 text-purple-700 border-2 border-purple-300'
                        : 'bg-gray-100 text-gray-600 border-2 border-gray-200 hover:bg-gray-200'
                    }`}
                  >
                    {perm}
                  </button>
                ),
              )}
            </div>
          </div>

          {/* Prompt Templates */}
          <div className="border-t pt-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Prompt Templates</h3>

            {/* System Template */}
            <div className="mb-4">
              <label className="text-sm font-medium text-gray-700 mb-1 block">
                System Template
              </label>
              <div className="space-y-2">
                {(editingPersona.prompt_system_template || []).map((template, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <textarea
                      value={template}
                      onChange={(e) => {
                        const newTemplates = [...(editingPersona.prompt_system_template || [])];
                        newTemplates[idx] = e.target.value;
                        onUpdate({ ...editingPersona, prompt_system_template: newTemplates });
                      }}
                      rows={3}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      placeholder="Enter system template"
                    />
                    <button
                      onClick={() => {
                        const newTemplates = editingPersona.prompt_system_template.filter(
                          (_, i) => i !== idx,
                        );
                        onUpdate({ ...editingPersona, prompt_system_template: newTemplates });
                      }}
                      className="p-1 text-red-500 hover:bg-red-50 rounded-lg"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => {
                    onUpdate({
                      ...editingPersona,
                      prompt_system_template: [
                        ...(editingPersona.prompt_system_template || []),
                        '',
                      ],
                    });
                  }}
                  className="text-indigo-600 hover:text-indigo-700 text-sm font-medium flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" /> Add System Template
                </button>
              </div>
            </div>

            {/* User Template */}
            <div className="mb-4">
              <label className="text-sm font-medium text-gray-700 mb-1 block">User Template</label>
              <div className="space-y-2">
                {(editingPersona.prompt_user_template || []).map((template, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <textarea
                      value={template}
                      onChange={(e) => {
                        const newTemplates = [...(editingPersona.prompt_user_template || [])];
                        newTemplates[idx] = e.target.value;
                        onUpdate({ ...editingPersona, prompt_user_template: newTemplates });
                      }}
                      rows={3}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      placeholder="Enter user template"
                    />
                    <button
                      onClick={() => {
                        const newTemplates = editingPersona.prompt_user_template.filter(
                          (_, i) => i !== idx,
                        );
                        onUpdate({ ...editingPersona, prompt_user_template: newTemplates });
                      }}
                      className="p-1 text-red-500 hover:bg-red-50 rounded-lg"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => {
                    onUpdate({
                      ...editingPersona,
                      prompt_user_template: [...(editingPersona.prompt_user_template || []), ''],
                    });
                  }}
                  className="text-indigo-600 hover:text-indigo-700 text-sm font-medium flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" /> Add User Template
                </button>
              </div>
            </div>

            {/* Context Template */}
            <div className="mb-4">
              <label className="text-sm font-medium text-gray-700 mb-1 block">
                Context Template
              </label>
              <div className="space-y-2">
                {(editingPersona.prompt_context_template || []).map((template, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <textarea
                      value={template}
                      onChange={(e) => {
                        const newTemplates = [...(editingPersona.prompt_context_template || [])];
                        newTemplates[idx] = e.target.value;
                        onUpdate({ ...editingPersona, prompt_context_template: newTemplates });
                      }}
                      rows={3}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      placeholder="Enter context template"
                    />
                    <button
                      onClick={() => {
                        const newTemplates = editingPersona.prompt_context_template.filter(
                          (_, i) => i !== idx,
                        );
                        onUpdate({ ...editingPersona, prompt_context_template: newTemplates });
                      }}
                      className="p-1 text-red-500 hover:bg-red-50 rounded-lg"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => {
                    onUpdate({
                      ...editingPersona,
                      prompt_context_template: [
                        ...(editingPersona.prompt_context_template || []),
                        '',
                      ],
                    });
                  }}
                  className="text-indigo-600 hover:text-indigo-700 text-sm font-medium flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" /> Add Context Template
                </button>
              </div>
            </div>

            {/* Instruction */}
            <div className="mb-4">
              <label className="text-sm font-medium text-gray-700 mb-1 block">Instruction</label>
              <div className="space-y-2">
                {(editingPersona.prompt_instruction || []).map((instruction, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <textarea
                      value={instruction}
                      onChange={(e) => {
                        const newInstructions = [...(editingPersona.prompt_instruction || [])];
                        newInstructions[idx] = e.target.value;
                        onUpdate({ ...editingPersona, prompt_instruction: newInstructions });
                      }}
                      rows={3}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      placeholder="Enter instruction"
                    />
                    <button
                      onClick={() => {
                        const newInstructions = editingPersona.prompt_instruction.filter(
                          (_, i) => i !== idx,
                        );
                        onUpdate({ ...editingPersona, prompt_instruction: newInstructions });
                      }}
                      className="p-1 text-red-500 hover:bg-red-50 rounded-lg"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => {
                    onUpdate({
                      ...editingPersona,
                      prompt_instruction: [...(editingPersona.prompt_instruction || []), ''],
                    });
                  }}
                  className="text-indigo-600 hover:text-indigo-700 text-sm font-medium flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" /> Add Instruction
                </button>
              </div>
            </div>
          </div>

          {/* Agent Settings */}
          <div className="border-t pt-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Agent Settings</h3>

            {/* Agent Delegate */}
            <div className="mb-4">
              <label className="text-sm font-medium text-gray-700 mb-1 block">Agent Delegate</label>
              <div className="space-y-2">
                {(editingPersona.agent_delegate || []).map((agent, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={agent}
                      onChange={(e) => {
                        const newAgents = [...(editingPersona.agent_delegate || [])];
                        newAgents[idx] = e.target.value;
                        onUpdate({ ...editingPersona, agent_delegate: newAgents });
                      }}
                      className="flex-1 px-3 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      placeholder="Enter agent name"
                    />
                    <button
                      onClick={() => {
                        const newAgents = editingPersona.agent_delegate.filter((_, i) => i !== idx);
                        onUpdate({ ...editingPersona, agent_delegate: newAgents });
                      }}
                      className="p-1 text-red-500 hover:bg-red-50 rounded-lg"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => {
                    onUpdate({
                      ...editingPersona,
                      agent_delegate: [...(editingPersona.agent_delegate || []), ''],
                    });
                  }}
                  className="text-indigo-600 hover:text-indigo-700 text-sm font-medium flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" /> Add Agent Delegate
                </button>
              </div>
            </div>

            {/* Agent Call */}
            <div className="mb-4">
              <label className="text-sm font-medium text-gray-700 mb-1 block">Agent Call</label>
              <div className="space-y-2">
                {(editingPersona.agent_call || []).map((agent, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={agent}
                      onChange={(e) => {
                        const newAgents = [...(editingPersona.agent_call || [])];
                        newAgents[idx] = e.target.value;
                        onUpdate({ ...editingPersona, agent_call: newAgents });
                      }}
                      className="flex-1 px-3 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      placeholder="Enter agent name"
                    />
                    <button
                      onClick={() => {
                        const newAgents = editingPersona.agent_call.filter((_, i) => i !== idx);
                        onUpdate({ ...editingPersona, agent_call: newAgents });
                      }}
                      className="p-1 text-red-500 hover:bg-red-50 rounded-lg"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => {
                    onUpdate({
                      ...editingPersona,
                      agent_call: [...(editingPersona.agent_call || []), ''],
                    });
                  }}
                  className="text-indigo-600 hover:text-indigo-700 text-sm font-medium flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" /> Add Agent Call
                </button>
              </div>
            </div>
          </div>

          {/* Memory Configuration */}
          <div className="border-t pt-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Memory Configuration</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="memory-enabled"
                  checked={editingPersona.memory?.enabled || false}
                  onChange={(e) =>
                    onUpdate({
                      ...editingPersona,
                      memory: { ...editingPersona.memory, enabled: e.target.checked },
                    })
                  }
                  className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                />
                <label htmlFor="memory-enabled" className="text-sm text-gray-700">
                  Enable Memory
                </label>
              </div>
              <div>
                <select
                  value={editingPersona.memory?.scope || 'session'}
                  onChange={(e) =>
                    onUpdate({
                      ...editingPersona,
                      memory: {
                        ...editingPersona.memory,
                        scope: e.target.value as 'session' | 'persistent',
                      },
                    })
                  }
                  disabled={!editingPersona.memory?.enabled}
                  className="w-full px-3 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                >
                  <option value="session">Session</option>
                  <option value="persistent">Persistent</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!persona) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900">{persona.name}</h2>
        <button
          onClick={onEdit}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Edit3 className="w-4 h-4" />
          Edit
        </button>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-sm text-gray-600">LLM Provider</div>
            <div className="font-semibold text-gray-900">{persona.llm_provider}</div>
          </div>
          <div>
            <div className="text-sm text-gray-600">LLM Temperature</div>
            <div className="font-semibold text-gray-900">{persona.llm_temperature}</div>
          </div>
          <div>
            <div className="text-sm text-gray-600">Role</div>
            <div className="font-semibold text-gray-900">{persona.role}</div>
          </div>
          <div>
            <div className="text-sm text-gray-600">Tone</div>
            <div className="font-semibold text-gray-900">{persona.tone}</div>
          </div>
        </div>

        {persona.context_files && persona.context_files.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wider mb-2">
              Context Files
            </h3>
            <div className="flex flex-wrap gap-2">
              {persona.context_files.map((file, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-700 rounded-lg text-sm"
                >
                  {file}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;

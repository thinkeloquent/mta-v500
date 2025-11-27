import {
  AlertTriangle,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Code,
  Cpu,
  Database,
  Edit3,
  Eye,
  FileText,
  Globe,
  Shield,
  Trash2,
  User,
  Wrench,
  Zap,
} from 'lucide-react';
import type React from 'react';
import { useState } from 'react';
import type { Persona } from '../types';

interface PersonaCardProps {
  persona: Persona;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onEdit: (persona: Persona) => void;
  onDelete: (id: string) => void;
  onExport?: (persona: Persona) => void;
}

const TOOL_ICONS: Record<string, React.FC<{ className?: string }>> = {
  'web-search': Globe,
  'code-gen': Code,
  'analysis-engine': AlertTriangle,
  debugger: AlertTriangle,
  'test-runner': CheckCircle,
};

const PERMISSION_ICONS: Record<string, React.FC<{ className?: string }>> = {
  read_repo: Eye,
  write_code: Edit3,
  run_test: CheckCircle,
  generate_report: FileText,
  access_docs: Database,
};

const PersonaCard: React.FC<PersonaCardProps> = ({
  persona,
  isSelected,
  onSelect,
  onEdit,
  onDelete,
  onExport,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div
      className={`bg-white rounded-xl border-2 transition-all duration-300 hover:shadow-lg cursor-pointer ${
        isSelected ? 'border-indigo-500 shadow-lg' : 'border-gray-200'
      }`}
      onClick={() => onSelect(persona.id)}
    >
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center text-white">
              <User className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900">{persona.name}</h3>
              <p className="text-sm text-gray-600">{persona.description}</p>
            </div>
          </div>
        </div>

        {/* Model & Settings */}
        <div className="flex flex-wrap gap-2 mb-4">
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-indigo-100 text-indigo-700 rounded-lg text-xs font-medium">
            <Cpu className="w-3 h-3" />
            {persona.llm_provider}
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-700 rounded-lg text-xs font-medium">
            <Zap className="w-3 h-3" />
            Temp: {persona.llm_temperature}
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 rounded-lg text-xs font-medium">
            <Database className="w-3 h-3" />
            {persona.memory.scope}
          </span>
        </div>

        {/* Expand/Collapse Details */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsExpanded(!isExpanded);
          }}
          className="flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-700 font-medium"
        >
          {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          {isExpanded ? 'Hide' : 'Show'} Details
        </button>

        {/* Expanded Details */}
        {isExpanded && (
          <div className="mt-4 pt-4 border-t border-gray-200 space-y-3">
            {/* Goals */}
            {persona.goals && persona.goals.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
                  Goals
                </h4>
                <div className="flex flex-wrap gap-1">
                  {persona.goals.map((goal) => (
                    <span
                      key={goal}
                      className="px-2 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs"
                    >
                      {goal}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Tools */}
            {persona.tools && persona.tools.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
                  Tools
                </h4>
                <div className="flex flex-wrap gap-2">
                  {persona.tools.map((tool) => {
                    const Icon = TOOL_ICONS[tool] || Wrench;
                    return (
                      <span
                        key={tool}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 rounded-lg text-xs"
                      >
                        <Icon className="w-3 h-3" />
                        {tool}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Permitted To */}
            {persona.permitted_to && persona.permitted_to.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
                  Permitted To
                </h4>
                <div className="flex flex-wrap gap-2">
                  {persona.permitted_to.map((perm) => {
                    const Icon = PERMISSION_ICONS[perm] || Shield;
                    return (
                      <span
                        key={perm}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-purple-50 text-purple-700 rounded-lg text-xs"
                      >
                        <Icon className="w-3 h-3" />
                        {perm}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-2 pt-3">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(persona);
                }}
                className="flex-1 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 transition-colors"
              >
                Edit
              </button>
              {onExport && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onExport(persona);
                  }}
                  className="flex-1 px-3 py-1.5 bg-gray-600 text-white rounded-lg text-sm hover:bg-gray-700 transition-colors"
                >
                  Export
                </button>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(persona.id);
                }}
                className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PersonaCard;

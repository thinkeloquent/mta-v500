import { useState, useCallback, useMemo, useEffect } from 'react';
import {
  ChevronRight,
  ChevronDown,
  Plus,
  Trash2,
  Copy,
  MoreVertical,
  Settings,
  Filter,
  Hash,
  Type,
  Calendar,
  ToggleLeft,
  Check,
  X,
  AlertCircle,
  FolderPlus,
  Folder,
  FolderOpen,
  FileText,
  Layers,
  Save,
  RefreshCw,
} from 'lucide-react';

// Types
interface RuleCondition {
  id: string;
  type: 'condition';
  field: string;
  operator: string;
  valueType: 'value' | 'field' | 'function' | 'regex';
  value: string;
  dataType?: 'string' | 'number' | 'boolean' | 'date';
  description?: string;
  enabled: boolean;
  validation?: {
    isValid: boolean;
    message?: string;
  };
}

interface RuleGroup {
  id: string;
  type: 'group';
  name: string;
  logic: 'AND' | 'OR' | 'NOT' | 'XOR';
  conditions: (RuleCondition | RuleGroup)[];
  expanded: boolean;
  enabled: boolean;
  color?: string;
  description?: string;
}

type RuleItem = RuleCondition | RuleGroup;

interface ApiStats {
  total: number;
  groups: number;
  conditions: number;
  enabled: number;
}

// Field definitions
const availableFields = [
  { value: 'user_id', label: 'User ID', type: 'string', icon: Hash },
  { value: 'email', label: 'Email', type: 'string', icon: Type },
  { value: 'age', label: 'Age', type: 'number', icon: Hash },
  { value: 'created_at', label: 'Created Date', type: 'date', icon: Calendar },
  { value: 'is_active', label: 'Is Active', type: 'boolean', icon: ToggleLeft },
  { value: 'department', label: 'Department', type: 'string', icon: Folder },
  { value: 'salary', label: 'Salary', type: 'number', icon: Hash },
  { value: 'last_login', label: 'Last Login', type: 'date', icon: Calendar },
  { value: 'role', label: 'Role', type: 'string', icon: Settings },
  { value: 'country', label: 'Country', type: 'string', icon: Type },
];

// Operators by data type
const operatorsByType: Record<string, { value: string; label: string }[]> = {
  string: [
    { value: 'equals', label: 'equals' },
    { value: 'not_equals', label: 'not equals' },
    { value: 'contains', label: 'contains' },
    { value: 'not_contains', label: 'does not contain' },
    { value: 'starts_with', label: 'starts with' },
    { value: 'ends_with', label: 'ends with' },
    { value: 'regex', label: 'matches regex' },
    { value: 'in', label: 'in list' },
    { value: 'not_in', label: 'not in list' },
  ],
  number: [
    { value: 'equals', label: '=' },
    { value: 'not_equals', label: '≠' },
    { value: 'greater_than', label: '>' },
    { value: 'greater_or_equal', label: '≥' },
    { value: 'less_than', label: '<' },
    { value: 'less_or_equal', label: '≤' },
    { value: 'between', label: 'between' },
    { value: 'not_between', label: 'not between' },
  ],
  boolean: [
    { value: 'is_true', label: 'is true' },
    { value: 'is_false', label: 'is false' },
    { value: 'is_null', label: 'is null' },
    { value: 'is_not_null', label: 'is not null' },
  ],
  date: [
    { value: 'equals', label: 'on' },
    { value: 'before', label: 'before' },
    { value: 'after', label: 'after' },
    { value: 'between', label: 'between' },
    { value: 'in_last', label: 'in last' },
    { value: 'not_in_last', label: 'not in last' },
    { value: 'is_today', label: 'is today' },
    { value: 'is_yesterday', label: 'is yesterday' },
  ],
};

// Tree Table Row Component
const TreeTableRow: React.FC<{
  item: RuleItem;
  depth: number;
  onUpdate: (item: RuleItem) => void;
  onDelete: (id: string) => void;
  onAddCondition: (parentId: string) => void;
  onAddGroup: (parentId: string) => void;
  onToggleExpand?: (id: string) => void;
  onDuplicate: (item: RuleItem) => void;
  isLast?: boolean;
  parentEnabled?: boolean;
}> = ({
  item,
  depth,
  onUpdate,
  onDelete,
  onAddCondition,
  onAddGroup,
  onToggleExpand,
  onDuplicate,
  isLast = false,
  parentEnabled = true,
}) => {
  const [showActions, setShowActions] = useState(false);

  const isGroup = item.type === 'group';
  const group = item as RuleGroup;
  const condition = item as RuleCondition;
  const isEnabled = parentEnabled && item.enabled;

  // Get field type for condition
  const fieldType = useMemo(() => {
    if (!isGroup) {
      const field = availableFields.find((f) => f.value === condition.field);
      return field?.type || 'string';
    }
    return null;
  }, [isGroup, condition.field]);

  // Get available operators for field type
  const operators = useMemo(() => {
    if (!isGroup && fieldType) {
      return operatorsByType[fieldType] || operatorsByType.string;
    }
    return [];
  }, [isGroup, fieldType]);

  const handleFieldChange = (field: string) => {
    const fieldDef = availableFields.find((f) => f.value === field);
    if (fieldDef) {
      const newOperators = operatorsByType[fieldDef.type];
      onUpdate({
        ...condition,
        field,
        dataType: fieldDef.type as 'string' | 'number' | 'boolean' | 'date',
        operator: newOperators[0].value,
      });
    }
  };

  const logicColors: Record<string, string> = {
    AND: 'bg-blue-100 text-blue-700 border-blue-300',
    OR: 'bg-green-100 text-green-700 border-green-300',
    NOT: 'bg-red-100 text-red-700 border-red-300',
    XOR: 'bg-purple-100 text-purple-700 border-purple-300',
  };

  return (
    <>
      <tr
        className={`
          group transition-all duration-200
          ${isEnabled ? 'hover:bg-gray-50' : 'opacity-50'}
          ${depth > 0 ? 'bg-gray-50/50' : ''}
          ${isLast && depth > 0 ? 'border-b-2 border-gray-200' : 'border-b border-gray-100'}
        `}
        onMouseEnter={() => setShowActions(true)}
        onMouseLeave={() => setShowActions(false)}
      >
        {/* Expand/Collapse & Type Column */}
        <td className="py-3 px-4 w-12">
          <div className="flex items-center" style={{ paddingLeft: `${depth * 24}px` }}>
            {isGroup ? (
              <button
                onClick={() => onToggleExpand?.(group.id)}
                className="p-1 hover:bg-gray-200 rounded transition-colors"
              >
                {group.expanded ? (
                  <ChevronDown className="w-4 h-4 text-gray-600" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-gray-600" />
                )}
              </button>
            ) : (
              <div className="w-6 h-6 flex items-center justify-center ml-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
              </div>
            )}
          </div>
        </td>

        {/* Enable/Disable Column */}
        <td className="py-3 px-2 w-10">
          <input
            type="checkbox"
            checked={item.enabled}
            onChange={(e) => onUpdate({ ...item, enabled: e.target.checked })}
            disabled={!parentEnabled}
            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 disabled:opacity-50"
          />
        </td>

        {/* Type Icon Column */}
        <td className="py-3 px-2 w-12">
          {isGroup ? (
            group.expanded ? (
              <FolderOpen className="w-5 h-5 text-amber-600" />
            ) : (
              <Folder className="w-5 h-5 text-amber-600" />
            )
          ) : (
            <FileText className="w-5 h-5 text-gray-500" />
          )}
        </td>

        {/* Logic/Field Column */}
        <td className="py-3 px-4 min-w-[180px]">
          {isGroup ? (
            <div className="flex items-center gap-2">
              <select
                value={group.logic}
                onChange={(e) => onUpdate({ ...group, logic: e.target.value as 'AND' | 'OR' | 'NOT' | 'XOR' })}
                disabled={!isEnabled}
                className={`px-3 py-1 text-sm font-medium border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  logicColors[group.logic]
                } ${!isEnabled ? 'cursor-not-allowed' : ''}`}
              >
                <option value="AND">AND</option>
                <option value="OR">OR</option>
                <option value="NOT">NOT</option>
                <option value="XOR">XOR</option>
              </select>
              <input
                type="text"
                value={group.name}
                onChange={(e) => onUpdate({ ...group, name: e.target.value })}
                disabled={!isEnabled}
                placeholder="Group name..."
                className="flex-1 px-2 py-1 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-50 disabled:cursor-not-allowed"
              />
            </div>
          ) : (
            <select
              value={condition.field}
              onChange={(e) => handleFieldChange(e.target.value)}
              disabled={!isEnabled}
              className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:cursor-not-allowed"
            >
              {availableFields.map((field) => (
                <option key={field.value} value={field.value}>
                  {field.label}
                </option>
              ))}
            </select>
          )}
        </td>

        {/* Operator Column */}
        <td className="py-3 px-4 min-w-[140px]">
          {!isGroup && (
            <select
              value={condition.operator}
              onChange={(e) => onUpdate({ ...condition, operator: e.target.value })}
              disabled={!isEnabled}
              className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:cursor-not-allowed"
            >
              {operators.map((op) => (
                <option key={op.value} value={op.value}>
                  {op.label}
                </option>
              ))}
            </select>
          )}
        </td>

        {/* Value Type Column */}
        <td className="py-3 px-4 min-w-[120px]">
          {!isGroup && (
            <select
              value={condition.valueType}
              onChange={(e) =>
                onUpdate({ ...condition, valueType: e.target.value as 'value' | 'field' | 'function' | 'regex' })
              }
              disabled={!isEnabled}
              className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:cursor-not-allowed"
            >
              <option value="value">Value</option>
              <option value="field">Field</option>
              <option value="function">Function</option>
              <option value="regex">Regex</option>
            </select>
          )}
        </td>

        {/* Value Column */}
        <td className="py-3 px-4 min-w-[200px]">
          {!isGroup && (
            <div className="flex items-center gap-2">
              {condition.valueType === 'field' ? (
                <select
                  value={condition.value}
                  onChange={(e) => onUpdate({ ...condition, value: e.target.value })}
                  disabled={!isEnabled}
                  className="flex-1 px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:cursor-not-allowed"
                >
                  <option value="">Select field...</option>
                  {availableFields
                    .filter((f) => f.type === fieldType)
                    .map((field) => (
                      <option key={field.value} value={field.value}>
                        {field.label}
                      </option>
                    ))}
                </select>
              ) : (
                <input
                  type={fieldType === 'number' ? 'number' : fieldType === 'date' ? 'date' : 'text'}
                  value={condition.value}
                  onChange={(e) => onUpdate({ ...condition, value: e.target.value })}
                  disabled={!isEnabled}
                  placeholder={`Enter ${condition.valueType}...`}
                  className="flex-1 px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:cursor-not-allowed"
                />
              )}
              {condition.validation && !condition.validation.isValid && (
                <div className="relative group">
                  <AlertCircle className="w-4 h-4 text-red-500" />
                  <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    {condition.validation.message}
                  </div>
                </div>
              )}
            </div>
          )}
          {isGroup && (
            <div className="text-sm text-gray-500">
              {group.conditions.length} {group.conditions.length === 1 ? 'rule' : 'rules'}
            </div>
          )}
        </td>

        {/* Status Column */}
        <td className="py-3 px-4 w-24">
          <div className="flex items-center justify-center">
            {condition.validation?.isValid === false ? (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full">
                <X className="w-3 h-3" />
                Invalid
              </span>
            ) : isEnabled ? (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                <Check className="w-3 h-3" />
                Active
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                <X className="w-3 h-3" />
                Disabled
              </span>
            )}
          </div>
        </td>

        {/* Actions Column */}
        <td className="py-3 px-4 w-32">
          <div
            className={`flex items-center gap-1 ${showActions ? 'opacity-100' : 'opacity-0'} transition-opacity`}
          >
            {isGroup && (
              <>
                <button
                  onClick={() => onAddCondition(group.id)}
                  className="p-1.5 hover:bg-blue-100 text-blue-600 rounded transition-colors"
                  title="Add Condition"
                >
                  <Plus className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onAddGroup(group.id)}
                  className="p-1.5 hover:bg-green-100 text-green-600 rounded transition-colors"
                  title="Add Group"
                >
                  <FolderPlus className="w-4 h-4" />
                </button>
              </>
            )}
            <button
              onClick={() => onDuplicate(item)}
              className="p-1.5 hover:bg-gray-100 text-gray-600 rounded transition-colors"
              title="Duplicate"
            >
              <Copy className="w-4 h-4" />
            </button>
            <button
              onClick={() => onDelete(item.id)}
              className="p-1.5 hover:bg-red-100 text-red-600 rounded transition-colors"
              title="Delete"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              className="p-1.5 hover:bg-gray-100 text-gray-600 rounded transition-colors"
              title="More Options"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
          </div>
        </td>
      </tr>

      {/* Render children if group is expanded */}
      {isGroup &&
        group.expanded &&
        group.conditions.map((child, index) => (
          <TreeTableRow
            key={child.id}
            item={child}
            depth={depth + 1}
            onUpdate={(updatedChild) => {
              const newConditions = [...group.conditions];
              newConditions[index] = updatedChild;
              onUpdate({ ...group, conditions: newConditions });
            }}
            onDelete={(childId) => {
              const newConditions = group.conditions.filter((c) => c.id !== childId);
              onUpdate({ ...group, conditions: newConditions });
            }}
            onAddCondition={onAddCondition}
            onAddGroup={onAddGroup}
            onToggleExpand={onToggleExpand}
            onDuplicate={onDuplicate}
            isLast={index === group.conditions.length - 1}
            parentEnabled={isEnabled}
          />
        ))}
    </>
  );
};

// Main Rule Tree Table Component
const RuleTreeTable: React.FC = () => {
  const [rules, setRules] = useState<RuleGroup>({
    id: 'root',
    type: 'group',
    name: 'Root Rules',
    logic: 'AND',
    expanded: true,
    enabled: true,
    conditions: [
      {
        id: '1',
        type: 'condition',
        field: 'age',
        operator: 'greater_than',
        valueType: 'value',
        value: '18',
        dataType: 'number',
        enabled: true,
        validation: { isValid: true },
      },
      {
        id: '2',
        type: 'group',
        name: 'Location Rules',
        logic: 'OR',
        expanded: true,
        enabled: true,
        conditions: [
          {
            id: '3',
            type: 'condition',
            field: 'country',
            operator: 'equals',
            valueType: 'value',
            value: 'USA',
            dataType: 'string',
            enabled: true,
            validation: { isValid: true },
          },
          {
            id: '4',
            type: 'condition',
            field: 'country',
            operator: 'equals',
            valueType: 'value',
            value: 'Canada',
            dataType: 'string',
            enabled: true,
            validation: { isValid: true },
          },
        ],
      },
      {
        id: '5',
        type: 'condition',
        field: 'is_active',
        operator: 'is_true',
        valueType: 'value',
        value: 'true',
        dataType: 'boolean',
        enabled: true,
        validation: { isValid: true },
      },
    ],
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [stats, setStats] = useState<ApiStats | null>(null);

  // Generate unique ID
  const generateId = () => `rule-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Fetch rules from API
  const fetchRules = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/rule-tree-table/rules');
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const data = await res.json();
      if (data.rules && data.rules.conditions && data.rules.conditions.length > 0) {
        setRules(data.rules);
      }
      setStats(data.stats);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch rules');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Save rules to API
  const saveRules = useCallback(async () => {
    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const res = await fetch('/api/rule-tree-table/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rules }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `HTTP error! status: ${res.status}`);
      }
      setStats(data.stats);
      setSuccessMessage('Rules saved successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save rules');
    } finally {
      setIsSaving(false);
    }
  }, [rules]);

  // Load rules on mount
  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  // Delete rule from tree
  const deleteRule = useCallback((id: string) => {
    const deleteFromTree = (node: RuleGroup): RuleGroup => {
      return {
        ...node,
        conditions: node.conditions
          .filter((child) => child.id !== id)
          .map((child) => (child.type === 'group' ? deleteFromTree(child as RuleGroup) : child)),
      };
    };

    setRules(deleteFromTree(rules));
  }, [rules]);

  // Add condition to group
  const addCondition = useCallback(
    (parentId: string) => {
      const newCondition: RuleCondition = {
        id: generateId(),
        type: 'condition',
        field: availableFields[0].value,
        operator: 'equals',
        valueType: 'value',
        value: '',
        dataType: 'string',
        enabled: true,
        validation: { isValid: true },
      };

      const addToTree = (node: RuleGroup): RuleGroup => {
        if (node.id === parentId) {
          return {
            ...node,
            conditions: [...node.conditions, newCondition],
            expanded: true,
          };
        }

        return {
          ...node,
          conditions: node.conditions.map((child) =>
            child.type === 'group' ? addToTree(child as RuleGroup) : child
          ),
        };
      };

      setRules(addToTree(rules));
    },
    [rules]
  );

  // Add group to parent
  const addGroup = useCallback(
    (parentId: string) => {
      const newGroup: RuleGroup = {
        id: generateId(),
        type: 'group',
        name: 'New Group',
        logic: 'AND',
        conditions: [],
        expanded: true,
        enabled: true,
      };

      const addToTree = (node: RuleGroup): RuleGroup => {
        if (node.id === parentId) {
          return {
            ...node,
            conditions: [...node.conditions, newGroup],
            expanded: true,
          };
        }

        return {
          ...node,
          conditions: node.conditions.map((child) =>
            child.type === 'group' ? addToTree(child as RuleGroup) : child
          ),
        };
      };

      setRules(addToTree(rules));
    },
    [rules]
  );

  // Toggle group expansion
  const toggleExpand = useCallback(
    (id: string) => {
      const toggleInTree = (node: RuleGroup): RuleGroup => {
        if (node.id === id) {
          return { ...node, expanded: !node.expanded };
        }

        return {
          ...node,
          conditions: node.conditions.map((child) =>
            child.type === 'group' ? toggleInTree(child as RuleGroup) : child
          ),
        };
      };

      setRules(toggleInTree(rules));
    },
    [rules]
  );

  // Duplicate item
  const duplicateItem = useCallback(
    (item: RuleItem) => {
      const duplicate = (obj: RuleItem): RuleItem => {
        const newItem = { ...obj, id: generateId() };
        if (newItem.type === 'group') {
          const group = newItem as RuleGroup;
          return {
            ...group,
            name: `${group.name} (Copy)`,
            conditions: group.conditions.map(duplicate),
          };
        }
        return newItem;
      };

      const duplicated = duplicate(item);

      // Add to root level for simplicity
      setRules({
        ...rules,
        conditions: [...rules.conditions, duplicated],
      });
    },
    [rules]
  );

  // Export rules as JSON
  const exportRules = () => {
    const json = JSON.stringify(rules, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'rules.json';
    a.click();
  };

  // Import rules from JSON
  const importRules = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const imported = JSON.parse(e.target?.result as string);
          setRules(imported);
        } catch {
          alert('Invalid JSON file');
        }
      };
      reader.readAsText(file);
    }
  };

  // Count total rules
  const countRules = (node: RuleGroup): number => {
    return node.conditions.reduce((count, child) => {
      if (child.type === 'group') {
        return count + countRules(child as RuleGroup);
      }
      return count + 1;
    }, 0);
  };

  const totalRules = countRules(rules);
  const groupCount = rules.conditions.filter((c) => c.type === 'group').length + 1;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Rule Tree Table</h1>
              <p className="text-gray-600 mt-1">Manage hierarchical rules with tree structure</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={fetchRules}
                disabled={isLoading}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              <button
                onClick={exportRules}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
              >
                <Layers className="w-4 h-4" />
                Export
              </button>
              <label className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors cursor-pointer">
                <Layers className="w-4 h-4" />
                Import
                <input type="file" accept=".json" onChange={importRules} className="hidden" />
              </label>
              <button
                onClick={() => addCondition('root')}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Condition
              </button>
              <button
                onClick={() => addGroup('root')}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
              >
                <FolderPlus className="w-4 h-4" />
                Add Group
              </button>
            </div>
          </div>

          {/* Error/Success Messages */}
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              {error}
            </div>
          )}
          {successMessage && (
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 flex items-center gap-2">
              <Check className="w-5 h-5" />
              {successMessage}
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-600 text-sm font-medium">Total Rules</p>
                  <p className="text-2xl font-bold text-blue-900">{stats?.total ?? totalRules}</p>
                </div>
                <Filter className="w-8 h-8 text-blue-400" />
              </div>
            </div>
            <div className="bg-green-50 rounded-lg p-4 border border-green-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-600 text-sm font-medium">Active Rules</p>
                  <p className="text-2xl font-bold text-green-900">{stats?.enabled ?? totalRules}</p>
                </div>
                <Check className="w-8 h-8 text-green-400" />
              </div>
            </div>
            <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-600 text-sm font-medium">Groups</p>
                  <p className="text-2xl font-bold text-purple-900">{stats?.groups ?? groupCount}</p>
                </div>
                <Folder className="w-8 h-8 text-purple-400" />
              </div>
            </div>
            <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-orange-600 text-sm font-medium">Conditions</p>
                  <p className="text-2xl font-bold text-orange-900">
                    {stats?.conditions ?? totalRules - groupCount + 1}
                  </p>
                </div>
                <FileText className="w-8 h-8 text-orange-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
                    <span className="sr-only">Expand</span>
                  </th>
                  <th className="py-3 px-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-10">
                    <input
                      type="checkbox"
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                  </th>
                  <th className="py-3 px-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
                    Type
                  </th>
                  <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[180px]">
                    Logic / Field
                  </th>
                  <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[140px]">
                    Operator
                  </th>
                  <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[120px]">
                    Value Type
                  </th>
                  <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[200px]">
                    Value
                  </th>
                  <th className="py-3 px-4 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                    Status
                  </th>
                  <th className="py-3 px-4 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {rules.conditions.map((item, index) => (
                  <TreeTableRow
                    key={item.id}
                    item={item}
                    depth={0}
                    onUpdate={(updatedItem) => {
                      const newConditions = [...rules.conditions];
                      newConditions[index] = updatedItem;
                      setRules({ ...rules, conditions: newConditions });
                    }}
                    onDelete={deleteRule}
                    onAddCondition={addCondition}
                    onAddGroup={addGroup}
                    onToggleExpand={toggleExpand}
                    onDuplicate={duplicateItem}
                    isLast={index === rules.conditions.length - 1}
                  />
                ))}
                {rules.conditions.length === 0 && (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-gray-500">
                      <div className="flex flex-col items-center">
                        <Filter className="w-12 h-12 text-gray-300 mb-3" />
                        <p className="text-lg font-medium">No rules defined</p>
                        <p className="text-sm mt-1">Click "Add Condition" or "Add Group" to get started</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 flex items-center justify-between">
          <p className="text-sm text-gray-600">
            Showing {totalRules} rules in {groupCount} groups
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchRules}
              className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={saveRules}
              disabled={isSaving}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              <Save className={`w-4 h-4 ${isSaving ? 'animate-pulse' : ''}`} />
              {isSaving ? 'Saving...' : 'Save Rules'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RuleTreeTable;

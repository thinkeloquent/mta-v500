export interface MemoryConfig {
  enabled: boolean;
  scope: 'session' | 'persistent';
  storage_id: string;
}

export interface Persona {
  id: string;
  name: string;
  description: string;
  role: 'assistant' | 'architect' | 'developer' | 'analyst';
  tone: 'neutral' | 'analytical' | 'friendly' | 'professional' | 'casual';
  llm_provider: string;
  llm_temperature: number;
  llm_parameters: Record<string, unknown>;
  goals: string[];
  tools: ('web-search' | 'code-gen' | 'analysis-engine' | 'debugger' | 'test-runner')[];
  permitted_to: ('read_repo' | 'write_code' | 'run_test' | 'generate_report' | 'access_docs')[];
  prompt_system_template: string[];
  prompt_user_template: string[];
  prompt_context_template: string[];
  prompt_instruction: string[];
  agent_delegate: string[];
  agent_call: string[];
  context_files: string[];
  memory: MemoryConfig;
  version: string;
  last_updated: string;
}

export type LLMDefaultCategory = 'tools' | 'permissions' | 'goals' | 'prompts' | 'tones' | 'roles';

export interface LLMDefault {
  id: string;
  category: LLMDefaultCategory;
  name: string;
  description: string;
  value: unknown; // Flexible JSON structure for different types of defaults
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

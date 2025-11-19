import type { LLMDefault, LLMDefaultCategory, Persona } from './types';

// Use environment variable for backend API domain, fallback to relative URL for production
const BACKEND_DOMAIN = import.meta.env.VITE_BACKEND_API_DOMAIN || '';
const API_BASE = BACKEND_DOMAIN ? `${BACKEND_DOMAIN}/api/apps/ask-ai` : '/api/apps/ask-ai';

function getMockPersonas(): Persona[] {
  return [
    {
      id: 'persona-1',
      name: 'Code Architect',
      description: 'Expert system architect for designing scalable applications',
      role: 'architect',
      tone: 'professional',
      llm_provider: 'openai',
      llm_temperature: 0.7,
      llm_parameters: { model: 'gpt-4', max_tokens: 2000 },
      goals: ['Design scalable systems', 'Optimize performance', 'Review architecture decisions'],
      tools: ['web-search', 'code-gen', 'analysis-engine'],
      permitted_to: ['read_repo', 'write_code', 'generate_report'],
      prompt_system_template: [],
      prompt_user_template: [],
      prompt_context_template: [],
      prompt_instruction: [],
      agent_delegate: [],
      agent_call: [],
      context_files: ['architecture.md', 'design-patterns.md'],
      memory: {
        enabled: true,
        scope: 'persistent',
        storage_id: 'memory-persona-1',
      },
      version: '1.0.0',
      last_updated: new Date().toISOString(),
    },
    {
      id: 'persona-2',
      name: 'Debug Assistant',
      description: 'Specialized in debugging and troubleshooting code issues',
      role: 'developer',
      tone: 'analytical',
      llm_provider: 'anthropic',
      llm_temperature: 0.3,
      llm_parameters: { model: 'claude-opus-4', max_tokens: 4000 },
      goals: ['Find and fix bugs', 'Analyze error logs', 'Suggest improvements'],
      tools: ['debugger', 'test-runner', 'analysis-engine'],
      permitted_to: ['read_repo', 'run_test', 'access_docs'],
      prompt_system_template: [],
      prompt_user_template: [],
      prompt_context_template: [],
      prompt_instruction: [],
      agent_delegate: [],
      agent_call: [],
      context_files: ['debugging-guide.md'],
      memory: {
        enabled: true,
        scope: 'session',
        storage_id: 'memory-persona-2',
      },
      version: '1.0.0',
      last_updated: new Date().toISOString(),
    },
    {
      id: 'persona-3',
      name: 'Data Analyst',
      description: 'Analyzes data patterns and generates insights',
      role: 'analyst',
      tone: 'neutral',
      llm_provider: 'google',
      llm_temperature: 0.5,
      llm_parameters: { model: 'gemini-pro', max_tokens: 3000 },
      goals: ['Analyze data patterns', 'Generate reports', 'Identify trends'],
      tools: ['analysis-engine', 'web-search'],
      permitted_to: ['read_repo', 'generate_report', 'access_docs'],
      prompt_system_template: [],
      prompt_user_template: [],
      prompt_context_template: [],
      prompt_instruction: [],
      agent_delegate: [],
      agent_call: [],
      context_files: ['data-schema.md'],
      memory: {
        enabled: false,
        scope: 'session',
        storage_id: 'memory-persona-3',
      },
      version: '1.0.0',
      last_updated: new Date().toISOString(),
    },
  ];
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = (await response.json().catch(() => ({ error: 'Unknown error' }))) as {
      error?: string;
    };
    throw new Error(error.error || `HTTP ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export const personasAPI = {
  list: async (): Promise<Persona[]> => {
    try {
      const response = await fetch(`${API_BASE}/personas`);
      return handleResponse<Persona[]>(response);
    } catch (_error) {
      // Fallback to mock data when API is unavailable
      return getMockPersonas();
    }
  },

  get: async (id: string): Promise<Persona> => {
    const response = await fetch(`${API_BASE}/personas/${id}`);
    return handleResponse<Persona>(response);
  },

  create: async (data: Omit<Persona, 'id' | 'last_updated'>): Promise<Persona> => {
    try {
      const response = await fetch(`${API_BASE}/personas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return handleResponse<Persona>(response);
    } catch (_error) {
      // Return a mock created persona when API is unavailable
      const newPersona: Persona = {
        ...data,
        id: `persona-${Date.now()}`,
        last_updated: new Date().toISOString(),
      } as Persona;
      return newPersona;
    }
  },

  update: async (id: string, data: Partial<Persona>): Promise<Persona> => {
    try {
      const response = await fetch(`${API_BASE}/personas/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return handleResponse<Persona>(response);
    } catch (_error) {
      // Return mock updated persona when API is unavailable
      return { ...data, last_updated: new Date().toISOString() } as Persona;
    }
  },

  delete: async (id: string): Promise<void> => {
    const response = await fetch(`${API_BASE}/personas/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      const error = (await response.json().catch(() => ({ error: 'Unknown error' }))) as {
        error?: string;
      };
      throw new Error(error.error || `HTTP ${response.status}`);
    }
    // 204 No Content - no response body
  },
};

export const llmDefaultsAPI = {
  list: async (): Promise<LLMDefault[]> => {
    const response = await fetch(`${API_BASE}/llm-defaults`);
    return handleResponse<LLMDefault[]>(response);
  },

  getByCategory: async (category: LLMDefaultCategory): Promise<LLMDefault[]> => {
    const response = await fetch(`${API_BASE}/llm-defaults/category/${category}`);
    return handleResponse<LLMDefault[]>(response);
  },

  get: async (id: string): Promise<LLMDefault> => {
    const response = await fetch(`${API_BASE}/llm-defaults/${id}`);
    return handleResponse<LLMDefault>(response);
  },

  create: async (
    data: Omit<LLMDefault, 'id' | 'created_at' | 'updated_at'>,
  ): Promise<LLMDefault> => {
    const response = await fetch(`${API_BASE}/llm-defaults`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse<LLMDefault>(response);
  },

  update: async (
    id: string,
    data: Partial<Omit<LLMDefault, 'id' | 'created_at' | 'updated_at'>>,
  ): Promise<LLMDefault> => {
    const response = await fetch(`${API_BASE}/llm-defaults/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse<LLMDefault>(response);
  },

  delete: async (id: string): Promise<void> => {
    const response = await fetch(`${API_BASE}/llm-defaults/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      const error = (await response.json().catch(() => ({ error: 'Unknown error' }))) as {
        error?: string;
      };
      throw new Error(error.error || `HTTP ${response.status}`);
    }
    // 204 No Content - no response body
    return;
  },
};

import { Page } from '@playwright/test';

// Mock persona data matching the types from the app
export const mockPersonas = [
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
];

// Mock LLM defaults
export const mockLLMDefaults = [
  {
    id: 'default-1',
    name: 'GPT-4 Standard',
    category: 'chat',
    provider: 'openai',
    model: 'gpt-4',
    temperature: 0.7,
    max_tokens: 2000,
    is_default: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

// Setup API route mocking for a page
export async function setupApiMocks(page: Page) {
  // Store created personas for dynamic responses
  let personas = [...mockPersonas];
  let llmDefaults = [...mockLLMDefaults];

  // Mock GET/POST /api/apps/ask-ai/personas
  await page.route('**/api/apps/ask-ai/personas', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(personas),
      });
    } else if (route.request().method() === 'POST') {
      const body = route.request().postDataJSON();
      const newPersona = {
        id: `persona-${Date.now()}`,
        ...body,
        last_updated: new Date().toISOString(),
      };
      personas.push(newPersona);
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify(newPersona),
      });
    } else {
      await route.continue();
    }
  });

  // Mock GET/PUT/DELETE /api/apps/ask-ai/personas/:id
  await page.route('**/api/apps/ask-ai/personas/*', async (route) => {
    const url = route.request().url();
    const id = url.split('/').pop();
    const method = route.request().method();

    if (method === 'GET') {
      const persona = personas.find((p) => p.id === id);
      if (persona) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(persona),
        });
      } else {
        await route.fulfill({
          status: 404,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Not found' }),
        });
      }
    } else if (method === 'PUT') {
      const body = route.request().postDataJSON();
      const index = personas.findIndex((p) => p.id === id);
      if (index !== -1) {
        personas[index] = { ...personas[index], ...body, last_updated: new Date().toISOString() };
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(personas[index]),
        });
      } else {
        await route.fulfill({
          status: 404,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Not found' }),
        });
      }
    } else if (method === 'DELETE') {
      personas = personas.filter((p) => p.id !== id);
      await route.fulfill({
        status: 204,
        body: '',
      });
    } else {
      await route.continue();
    }
  });

  // Mock LLM defaults endpoints
  await page.route('**/api/apps/ask-ai/llm-defaults**', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(llmDefaults),
      });
    } else if (route.request().method() === 'POST') {
      const body = route.request().postDataJSON();
      const newDefault = {
        id: `default-${Date.now()}`,
        ...body,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      llmDefaults.push(newDefault);
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify(newDefault),
      });
    } else {
      await route.continue();
    }
  });
}

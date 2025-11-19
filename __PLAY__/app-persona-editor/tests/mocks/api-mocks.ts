import { Page } from '@playwright/test';

// Mock persona data
export const mockPersonas = [
  {
    id: '1',
    name: 'Test Assistant',
    role: 'assistant',
    description: 'A helpful test assistant',
    status: 'idle',
    model: 'gpt-4-turbo',
    temperature: 0.7,
    goals: ['Help users', 'Provide accurate information'],
    tools: ['web-search', 'read_repo'],
    permissions: ['read', 'write'],
    contextFiles: [],
    memory: { enabled: false, scope: 'session' },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '2',
    name: 'Code Reviewer',
    role: 'reviewer',
    description: 'Reviews code for best practices',
    status: 'active',
    model: 'gpt-4-turbo',
    temperature: 0.3,
    goals: ['Review code', 'Suggest improvements'],
    tools: ['read_repo', 'analyze_code'],
    permissions: ['read'],
    contextFiles: ['review-guidelines.md'],
    memory: { enabled: true, scope: 'persistent' },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

// Setup API route mocking for a page
export async function setupApiMocks(page: Page) {
  // Store created personas for dynamic responses
  let personas = [...mockPersonas];

  // Mock GET /api/personas
  await page.route('**/api/personas', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(personas),
      });
    } else if (route.request().method() === 'POST') {
      const body = route.request().postDataJSON();
      const newPersona = {
        id: String(personas.length + 1),
        ...body,
        status: 'idle',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
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

  // Mock GET/PUT/DELETE /api/personas/:id
  await page.route('**/api/personas/*', async (route) => {
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
        personas[index] = { ...personas[index], ...body, updatedAt: new Date().toISOString() };
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

  // Mock sessions endpoints
  await page.route('**/api/sessions**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([]),
    });
  });

  // Mock analytics endpoints
  await page.route('**/api/analytics**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        totalSessions: 0,
        tokensUsed: 0,
        avgDuration: 0,
        successRate: 100,
        timeline: [],
      }),
    });
  });

  // Mock logs endpoints
  await page.route('**/api/logs**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([]),
    });
  });
}

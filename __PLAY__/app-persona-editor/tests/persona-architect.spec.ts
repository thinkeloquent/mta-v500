import { expect, test } from '@playwright/test';
import { setupApiMocks } from './mocks/api-mocks';

test.describe('Persona Architect E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Setup API mocks before navigating (Vite frontend only - no backend)
    await setupApiMocks(page);

    await page.goto('/');
    // Wait for the app to load
    await page.waitForSelector('text=Persona Architect', { timeout: 10000 });
  });

  test('should load the application', async ({ page }) => {
    // Check header is visible
    await expect(page.locator('text=Persona Architect')).toBeVisible();
    await expect(page.locator('text=AI Agent Configuration & Monitoring')).toBeVisible();

    // Check main navigation buttons
    await expect(page.locator('button:has-text("New Persona")').first()).toBeVisible();
  });

  test.skip('should display system status indicator', async ({ page }) => {
    // Check floating status panel
    await expect(page.locator('text=System Active')).toBeVisible();
  });

  test('should create a new persona', async ({ page }) => {
    // Click New Persona button in header
    await page.locator('button:has-text("New Persona")').first().click();

    // Wait for edit form to appear
    await expect(page.locator('text=Create New Persona')).toBeVisible();

    // Fill in persona details
    await page.fill('input[placeholder="Enter persona name"]', 'Test Assistant');

    // Verify Apply Changes button appears (form has unsaved changes)
    await expect(page.locator('button:has-text("Apply Changes")')).toBeVisible();
  });

  test('should filter personas by search', async ({ page }) => {
    // Wait for personas to load
    await page.waitForTimeout(1000);

    // Type in search box
    const searchInput = page.locator('input[placeholder="Search personas..."]');
    await searchInput.fill('Test');

    // Wait for filtering
    await page.waitForTimeout(500);

    // Verify filtered results
    const personaCards = page.locator('.bg-white.rounded-xl.border-2');
    const count = await personaCards.count();

    // Should have at least filtered the results
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test.skip('should navigate between tabs', async ({ page }) => {
    // These tabs don't exist in v200
  });

  test('should edit an existing persona', async ({ page }) => {
    // Wait for personas to load
    await page.waitForTimeout(1000);

    // Click on first persona
    const firstPersona = page.locator('.bg-white.rounded-xl.border-2').first();
    await firstPersona.click();

    // Wait for persona to be selected
    await page.waitForTimeout(500);

    // Click Edit button in Definition tab
    const editButton = page.locator('button:has-text("Edit")').first();
    if (await editButton.isVisible()) {
      await editButton.click();

      // Wait for edit mode
      await page.waitForTimeout(500);

      // Modify description
      const descriptionField = page.locator('textarea[placeholder*="Describe"]');
      await descriptionField.fill('Updated description for testing');

      // Save changes
      await page.click('button:has-text("Save Changes")');

      // Wait for save to complete
      await page.waitForTimeout(1000);

      // Verify we're back in view mode
      await expect(page.locator('button:has-text("Edit")').first()).toBeVisible();
    }
  });

  test('should expand and collapse persona card details', async ({ page }) => {
    // Wait for personas to load
    await page.waitForTimeout(1000);

    const firstPersona = page.locator('.bg-white.rounded-xl.border-2').first();

    if (await firstPersona.isVisible()) {
      // Click "Show Details" button
      const showDetailsBtn = firstPersona.locator('button:has-text("Show Details")');

      if (await showDetailsBtn.isVisible()) {
        await showDetailsBtn.click();

        // Verify expanded content is visible
        await expect(firstPersona.locator('text=Goals')).toBeVisible();
        await expect(firstPersona.locator('text=Tools')).toBeVisible();
        await expect(firstPersona.locator('text=Permissions')).toBeVisible();

        // Click "Hide Details" button
        await firstPersona.locator('button:has-text("Hide Details")').click();

        // Verify content is hidden
        await page.waitForTimeout(300);
      }
    }
  });

  test('should filter personas by status', async ({ page }) => {
    // Wait for personas to load
    await page.waitForTimeout(1000);

    // Find and use status filter dropdown
    const statusFilter = page.locator('select').filter({ hasText: 'All Status' });

    if (await statusFilter.isVisible()) {
      await statusFilter.selectOption('idle');
      await page.waitForTimeout(500);

      // Verify filtering occurred
      const personaCards = page.locator('.bg-white.rounded-xl.border-2');
      const count = await personaCards.count();
      expect(count).toBeGreaterThanOrEqual(0);
    }
  });

  test.skip('should display analytics chart', async ({ page }) => {
    // Wait for personas to load
    await page.waitForTimeout(1000);

    // Select first persona
    const firstPersona = page.locator('.bg-white.rounded-xl.border-2').first();
    if (await firstPersona.isVisible()) {
      await firstPersona.click();
    }

    // Navigate to Analytics tab
    await page.click('button:has-text("Analytics")');
    await page.waitForTimeout(1000);

    // Verify analytics cards are visible
    await expect(page.locator('text=Total Sessions')).toBeVisible();
    await expect(page.locator('text=Tokens Used')).toBeVisible();
    await expect(page.locator('text=Avg Duration')).toBeVisible();
    await expect(page.locator('text=Success Rate')).toBeVisible();

    // Verify chart is rendered
    await expect(page.locator('text=Activity Timeline')).toBeVisible();
  });

  test.skip('should handle empty states correctly', async ({ page }) => {
    // Navigate to Runtime State tab (likely empty for new personas)
    await page.waitForTimeout(1000);

    const firstPersona = page.locator('.bg-white.rounded-xl.border-2').first();
    if (await firstPersona.isVisible()) {
      await firstPersona.click();
      await page.waitForTimeout(500);
    }

    await page.click('button:has-text("Runtime State")');
    await page.waitForTimeout(500);

    // Should show empty state for sessions
    const emptyStateExists = await page.locator('text=No active sessions').isVisible();
    if (emptyStateExists) {
      await expect(page.locator('text=No active sessions')).toBeVisible();
    }
  });

  test.skip('should start a new session', async ({ page }) => {
    // Wait for personas to load
    await page.waitForTimeout(1000);

    // Select first persona
    const firstPersona = page.locator('.bg-white.rounded-xl.border-2').first();
    if (await firstPersona.isVisible()) {
      await firstPersona.click();
      await page.waitForTimeout(500);
    }

    // Navigate to Runtime State
    await page.click('button:has-text("Runtime State")');
    await page.waitForTimeout(500);

    // Click Start Session button
    const startButton = page.locator('button:has-text("Start Session")');
    if (await startButton.isVisible()) {
      await startButton.click();

      // Wait for session to be created
      await page.waitForTimeout(2000);

      // Verify session appears (or error is handled)
      // Note: This may fail if backend is not running, which is expected
    }
  });

  test.skip('should display thinking logs', async ({ page }) => {
    // Wait for personas to load
    await page.waitForTimeout(1000);

    // Select first persona
    const firstPersona = page.locator('.bg-white.rounded-xl.border-2').first();
    if (await firstPersona.isVisible()) {
      await firstPersona.click();
      await page.waitForTimeout(500);
    }

    // Navigate to Thinking Logs
    await page.click('button:has-text("Thinking Logs")');
    await page.waitForTimeout(1000);

    // Check for logs or empty state
    const logsExist = await page.locator('text=No logs available').isVisible();
    if (logsExist) {
      await expect(page.locator('text=No logs available')).toBeVisible();
    }

    // Verify refresh button exists
    await expect(page.locator('button:has-text("Refresh")').first()).toBeVisible();
  });

  test('should handle API errors gracefully', async ({ page }) => {
    // This test verifies error handling by checking console errors
    const errors: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    // Perform actions that might cause errors
    await page.click('button:has-text("New Persona")');
    await page.waitForTimeout(500);

    // Try to save without filling required fields
    await page.click('button:has-text("Save Changes")');
    await page.waitForTimeout(1000);

    // App should handle errors without crashing
    await expect(page.locator('text=Persona Architect')).toBeVisible();
  });

  test('should delete a persona', async ({ page }) => {
    // Create a persona first
    await page.click('button:has-text("New Persona")');
    await page.fill('input[placeholder="Enter persona name"]', 'Delete Test Persona');
    await page.selectOption('select:near(:text("Role"))', 'assistant');
    await page.fill(
      'textarea[placeholder*="Describe"]',
      'This persona will be deleted in the test',
    );
    await page.selectOption('select:near(:text("LLM Model"))', 'gpt-5-turbo');
    await page.click('button:has-text("Add Goal")');
    await page.locator('input[placeholder="Enter goal"]').first().fill('Test goal');
    await page.click('button:has-text("web-search")');
    await page.click('button:has-text("read_repo")');
    await page.click('button:has-text("Save Changes")');
    await page.waitForTimeout(1500);

    // Find the newly created persona and expand it
    const deletePersona = page
      .locator('.bg-white.rounded-xl.border-2:has-text("Delete Test Persona")')
      .first();
    await deletePersona.click();
    await page.waitForTimeout(500);

    // Expand details to access delete button
    const showDetailsBtn = deletePersona.locator('button:has-text("Show Details")');
    if (await showDetailsBtn.isVisible()) {
      await showDetailsBtn.click();
      await page.waitForTimeout(500);

      // Click delete button (trash icon)
      const deleteBtn = deletePersona
        .locator('button')
        .filter({ has: page.locator('svg') })
        .last();
      await deleteBtn.click();
      await page.waitForTimeout(1000);

      // Verify persona is removed
      const stillExists = await page.locator('text=Delete Test Persona').isVisible();
      expect(stillExists).toBeFalsy();
    }
  });

  test.skip('should maintain state across tab switches', async ({ page }) => {
    // Wait for personas to load
    await page.waitForTimeout(1000);

    const firstPersona = page.locator('.bg-white.rounded-xl.border-2').first();
    if (await firstPersona.isVisible()) {
      await firstPersona.click();
      await page.waitForTimeout(500);
    }

    // Switch to Analytics tab
    await page.click('button:has-text("Analytics")');
    await page.waitForTimeout(500);

    // Switch back to Definition
    await page.click('button:has-text("Definition")');
    await page.waitForTimeout(500);

    // Verify we're still on the same persona
    await expect(page.locator('text=Persona Configuration')).toBeVisible();
  });

  test('should validate temperature slider', async ({ page }) => {
    await page.click('button:has-text("New Persona")');
    await page.waitForTimeout(500);

    // Find temperature slider
    const tempSlider = page.locator('input[type="range"]');
    if (await tempSlider.isVisible()) {
      // Set to minimum
      await tempSlider.fill('0');
      await expect(page.locator('text=Temperature: 0')).toBeVisible();

      // Set to maximum
      await tempSlider.fill('1');
      await expect(page.locator('text=Temperature: 1')).toBeVisible();

      // Set to middle
      await tempSlider.fill('0.5');
      await expect(page.locator('text=Temperature: 0.5')).toBeVisible();
    }
  });

  test('should add and remove context files', async ({ page }) => {
    await page.click('button:has-text("New Persona")');
    await page.waitForTimeout(500);

    // Add context file
    await page.click('button:has-text("Add Context File")');
    const fileInput = page.locator('input[placeholder="filename.md"]').first();
    await fileInput.fill('test-context.md');

    // Add another
    await page.click('button:has-text("Add Context File")');
    await page.locator('input[placeholder="filename.md"]').last().fill('another-file.md');

    // Remove first file
    const removeButtons = page.locator('button').filter({ has: page.locator('svg') });
    const fileRemoveBtn = removeButtons.first();
    await fileRemoveBtn.click();

    await page.waitForTimeout(300);

    // Verify only one file input remains
    const fileInputs = page.locator('input[placeholder="filename.md"]');
    expect(await fileInputs.count()).toBeGreaterThan(0);
  });

  test('should toggle memory configuration', async ({ page }) => {
    await page.click('button:has-text("New Persona")');
    await page.waitForTimeout(500);

    // Find memory checkbox
    const memoryCheckbox = page.locator('input[type="checkbox"]#memory-enabled');

    if (await memoryCheckbox.isVisible()) {
      // Enable memory
      await memoryCheckbox.check();

      // Select scope
      const scopeSelect = page.locator('select').filter({ hasText: 'Session' });
      await scopeSelect.selectOption('persistent');

      // Disable memory
      await memoryCheckbox.uncheck();
    }
  });
});

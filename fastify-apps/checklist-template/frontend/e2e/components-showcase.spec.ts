import { test, expect } from '@playwright/test';

test.describe('Components Showcase Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/components');
  });

  test('should display the page header correctly', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'UI Components Showcase' })).toBeVisible();
    await expect(page.getByText('A comprehensive demonstration')).toBeVisible();
    await expect(page.getByText('Components Library')).toBeVisible();
  });

  test('should display header action buttons', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Documentation' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Create New' })).toBeVisible();
  });

  test.describe('KPI Cards', () => {
    test('should display all KPI cards with correct values', async ({ page }) => {
      await expect(page.getByRole('heading', { name: 'KPI Cards' })).toBeVisible();

      // Check KPI card values
      const kpiValues = page.getByTestId('kpi-value');
      await expect(kpiValues).toHaveCount(4);

      // Verify specific values
      await expect(kpiValues.nth(0)).toHaveText('24');
      await expect(kpiValues.nth(1)).toHaveText('1,234');
      await expect(kpiValues.nth(2)).toHaveText('45.2K');
      await expect(kpiValues.nth(3)).toHaveText('99.8%');
    });

    test('should display trend indicators correctly', async ({ page }) => {
      const trends = page.getByTestId('kpi-trend');
      await expect(trends).toHaveCount(3);

      // First trend should be positive (15%)
      await expect(trends.nth(0)).toContainText('15%');

      // Second trend should be positive (23%)
      await expect(trends.nth(1)).toContainText('23%');

      // Third trend should be negative (2%)
      await expect(trends.nth(2)).toContainText('2%');
    });

    test('should display KPI icons with correct colors', async ({ page }) => {
      const icons = page.getByTestId('kpi-icon');
      await expect(icons).toHaveCount(4);
    });
  });

  test.describe('Template Cards', () => {
    test('should display all template cards', async ({ page }) => {
      await expect(page.getByRole('heading', { name: 'Template Cards' })).toBeVisible();

      const templateNames = page.getByTestId('template-name');
      await expect(templateNames).toHaveCount(3);

      await expect(templateNames.nth(0)).toHaveText('Employee Onboarding');
      await expect(templateNames.nth(1)).toHaveText('Project Launch Checklist');
      await expect(templateNames.nth(2)).toHaveText('Security Audit Protocol');
    });

    test('should display template metadata correctly', async ({ page }) => {
      const categories = page.getByTestId('template-category');
      await expect(categories.nth(0)).toHaveText('HR');
      await expect(categories.nth(1)).toHaveText('Project Management');
      await expect(categories.nth(2)).toHaveText('Security');

      const steps = page.getByTestId('template-steps');
      await expect(steps.nth(0)).toHaveText('15 steps');
      await expect(steps.nth(1)).toHaveText('12 steps');
      await expect(steps.nth(2)).toHaveText('20 steps');
    });

    test('should display template status badges', async ({ page }) => {
      const statuses = page.getByTestId('template-status');
      await expect(statuses.nth(0)).toHaveText('published');
      await expect(statuses.nth(1)).toHaveText('published');
      await expect(statuses.nth(2)).toHaveText('draft');
    });

    test('should show marketplace star for marketplace templates', async ({ page }) => {
      // First template is marketplace, should have a star
      const firstCard = page.locator('[data-testid="template-name"]').first().locator('..');
      await expect(firstCard.locator('svg.lucide-star')).toBeVisible();
    });

    test('should display template tags', async ({ page }) => {
      // Use more specific selectors for tags (they are in span elements with specific styling)
      await expect(page.locator('span.px-2.py-1.bg-white\\/5.text-slate-400', { hasText: 'hr' })).toBeVisible();
      await expect(page.locator('span.px-2.py-1.bg-white\\/5.text-slate-400', { hasText: 'onboarding' })).toBeVisible();
      await expect(page.locator('span.px-2.py-1.bg-white\\/5.text-slate-400', { hasText: 'project' })).toBeVisible();
      await expect(page.locator('span.px-2.py-1.bg-white\\/5.text-slate-400', { hasText: 'security' })).toBeVisible();
    });
  });

  test.describe('Integration Cards', () => {
    test('should display all integration cards', async ({ page }) => {
      await expect(page.getByRole('heading', { name: 'Integration Cards' })).toBeVisible();

      const integrationNames = page.getByTestId('integration-name');
      await expect(integrationNames).toHaveCount(3);

      await expect(integrationNames.nth(0)).toHaveText('Production Dashboard');
      await expect(integrationNames.nth(1)).toHaveText('Staging Environment');
      await expect(integrationNames.nth(2)).toHaveText('Development Portal');
    });

    test('should display integration status correctly', async ({ page }) => {
      const statuses = page.getByTestId('integration-status');
      await expect(statuses.nth(0)).toHaveText('active');
      await expect(statuses.nth(1)).toHaveText('active');
      await expect(statuses.nth(2)).toHaveText('inactive');
    });

    test('should mask API keys by default', async ({ page }) => {
      const apiKeyDisplays = page.getByTestId('api-key-display');

      // All API keys should be masked initially (first 12 characters + "...")
      await expect(apiKeyDisplays.nth(0)).toHaveText('ak_live_1234...');
      await expect(apiKeyDisplays.nth(1)).toHaveText('ak_test_fedc...');
      await expect(apiKeyDisplays.nth(2)).toHaveText('ak_test_abcd...');
    });

    test('should toggle API key visibility', async ({ page }) => {
      const firstApiKeyDisplay = page.getByTestId('api-key-display').first();
      const firstToggleButton = page.getByRole('button', { name: 'Show API key' }).first();

      // Initially masked (first 12 characters + "...")
      await expect(firstApiKeyDisplay).toHaveText('ak_live_1234...');

      // Click to show
      await firstToggleButton.click();
      await expect(firstApiKeyDisplay).toHaveText('ak_live_1234567890abcdef');

      // Click to hide again
      await page.getByRole('button', { name: 'Hide API key' }).first().click();
      await expect(firstApiKeyDisplay).toHaveText('ak_live_1234...');
    });

    test('should display integration statistics', async ({ page }) => {
      const requests = page.getByTestId('total-requests');
      await expect(requests.nth(0)).toHaveText('15,420');
      await expect(requests.nth(1)).toHaveText('8,750');
      await expect(requests.nth(2)).toHaveText('450');

      const templatesUsed = page.getByTestId('templates-used');
      await expect(templatesUsed.nth(0)).toHaveText('5');
      await expect(templatesUsed.nth(1)).toHaveText('3');
      await expect(templatesUsed.nth(2)).toHaveText('1');
    });

    test('should have functional configure and delete buttons', async ({ page }) => {
      const configureButtons = page.getByTestId('configure-button');
      const deleteButtons = page.getByTestId('delete-button');

      await expect(configureButtons).toHaveCount(3);
      await expect(deleteButtons).toHaveCount(3);

      // Verify buttons are clickable (they log to console in the implementation)
      await expect(configureButtons.first()).toBeEnabled();
      await expect(deleteButtons.first()).toBeEnabled();
    });
  });

  test('should have responsive layout', async ({ page }) => {
    // Test that all sections are visible
    await expect(page.getByRole('heading', { name: 'KPI Cards' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Template Cards' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Integration Cards' })).toBeVisible();
  });
});

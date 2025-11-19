import { chromium } from 'playwright';

async function testCors() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const consoleMessages = [];
  const networkErrors = [];
  const corsIssues = [];

  // Capture console messages
  page.on('console', (msg) => {
    const text = msg.text();
    consoleMessages.push({ type: msg.type(), text });

    // Check for CORS-related messages
    if (text.includes('CORS') || text.includes('cors')) {
      corsIssues.push({ source: 'console', message: text });
    }
  });

  // Capture network request failures
  page.on('requestfailed', (request) => {
    const failure = request.failure();
    const url = request.url();
    networkErrors.push({
      url,
      errorText: failure?.errorText || 'Unknown error',
    });

    // Check for CORS-related network errors
    if (failure?.errorText?.includes('CORS') || failure?.errorText?.includes('net::ERR_FAILED')) {
      corsIssues.push({ source: 'network', url, error: failure.errorText });
    }
  });

  // Track responses for CORS headers
  page.on('response', async (response) => {
    const url = response.url();
    if (url.includes('localhost:3000')) {
      const headers = response.headers();
      const corsHeader = headers['access-control-allow-origin'];
      console.log(`\n[Response] ${url}`);
      console.log(`  Status: ${response.status()}`);
      console.log(`  Access-Control-Allow-Origin: ${corsHeader || 'NOT SET'}`);

      if (!corsHeader && response.status() !== 204) {
        corsIssues.push({
          source: 'response',
          url,
          issue: 'Missing Access-Control-Allow-Origin header'
        });
      }
    }
  });

  console.log('Opening http://localhost:8080/apps/chat-window...\n');

  try {
    await page.goto('http://localhost:8080/apps/chat-window', {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    // Wait a bit for any async operations
    await page.waitForTimeout(3000);

    console.log('\n--- Console Messages ---');
    consoleMessages.forEach((msg) => {
      const prefix = msg.type === 'error' ? '❌' : msg.type === 'warning' ? '⚠️' : 'ℹ️';
      console.log(`${prefix} [${msg.type}] ${msg.text}`);
    });

    console.log('\n--- Network Errors ---');
    if (networkErrors.length === 0) {
      console.log('✅ No network errors');
    } else {
      networkErrors.forEach((err) => {
        console.log(`❌ ${err.url}: ${err.errorText}`);
      });
    }

    console.log('\n--- CORS Issues Summary ---');
    if (corsIssues.length === 0) {
      console.log('✅ No CORS issues detected');
    } else {
      corsIssues.forEach((issue) => {
        console.log(`❌ [${issue.source}] ${issue.message || issue.url}: ${issue.error || issue.issue || ''}`);
      });
    }

  } catch (error) {
    console.error('Error during test:', error.message);
  } finally {
    await browser.close();
  }
}

testCors().catch(console.error);

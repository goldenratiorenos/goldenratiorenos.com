const test = require('node:test');
const assert = require('node:assert');
const supertest = require('supertest');
const puppeteer = require('puppeteer-core');
const { startServer, stopServer, getChromePath, registerBrowser } = require('./test_helper');

test.describe('E2E Infrastructure Verification', () => {
  let browser = null;
  let port = null;

  test.before(async () => {
    // Start server as a background child process
    const proc = await startServer();
    port = proc.port;
  });

  test.after(async () => {
    // Properly clean up all server processes
    await stopServer();
  });

  test.afterEach(async () => {
    // Properly clean up all browser processes
    if (browser) {
      console.log('Closing browser...');
      await browser.close();
      browser = null;
    }
  });

  test('1. Verify server API is running using supertest', async () => {
    const request = supertest(`http://localhost:${port}`);

    // Test a valid contact form submission API request
    const response = await request
      .post('/api/contact')
      .send({
        name: 'John Doe',
        email: 'john.doe@example.com',
        phone: '555-0199',
        projectDetails: 'Renovate the master bathroom.'
      });

    assert.strictEqual(response.status, 200);
    assert.deepStrictEqual(response.body, {
      success: true,
      message: 'Thank you, your request has been received!'
    });
  });

  test('2. Verify frontend page loads in Chrome using puppeteer-core', async () => {
    console.log('Launching browser...');
    const chromePath = getChromePath();
    console.log(`Using Chrome path: ${chromePath}`);
    browser = await puppeteer.launch({
      executablePath: chromePath,
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    registerBrowser(browser);

    const page = await browser.newPage();
    
    console.log(`Navigating to http://localhost:${port}...`);
    await page.goto(`http://localhost:${port}`, { waitUntil: 'domcontentloaded' });

    // Assert that the page title matches partially
    const title = await page.title();
    console.log(`Page title: "${title}"`);
    assert.ok(title.includes('Golden Ratio'), 'Title should contain "Golden Ratio"');
    assert.ok(title.includes('Renos'), 'Title should contain "Renos"');

    // Assert that the main h1 header is rendered with the expected text partially
    const headerText = await page.$eval('h1', el => el.textContent);
    console.log(`Header text found: "${headerText}"`);
    assert.ok(headerText.includes('Building'), 'Header should contain "Building"');
    assert.ok(headerText.includes('Renovating'), 'Header should contain "Renovating"');
  });
});

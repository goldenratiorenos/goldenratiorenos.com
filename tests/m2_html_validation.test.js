const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');
const { startServer, stopServer, getChromePath, registerBrowser } = require('./test_helper');

test.describe('Milestone M2 HTML Validation & Robustness Checks', () => {
  let browser = null;
  let page = null;
  let port = null;
  const htmlPath = path.join(__dirname, '../public/index.html');

  test.before(async () => {
    // Start server as a background child process
    const proc = await startServer();
    port = proc.port;
    
    // Launch puppeteer
    browser = await puppeteer.launch({
      executablePath: getChromePath(),
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    registerBrowser(browser);
    page = await browser.newPage();
    await page.goto(`http://localhost:${port}`, { waitUntil: 'domcontentloaded' });
  });

  test.after(async () => {
    if (browser) {
      await browser.close();
    }
    await stopServer();
  });

  test.describe('Static HTML Checks (File Level)', () => {
    test('1. Verify index.html file exists and has correct doctype', () => {
      assert.strictEqual(fs.existsSync(htmlPath), true, 'index.html should exist');
      const htmlContent = fs.readFileSync(htmlPath, 'utf8');
      
      // Check DOCTYPE
      assert.match(htmlContent, /<!DOCTYPE html>/i, 'HTML must start with DOCTYPE declaration');
      // Check lang attribute
      assert.match(htmlContent, /<html\s+lang="en">/i, 'HTML lang attribute must be set to "en"');
    });

    test('2. Check for unique IDs', () => {
      const htmlContent = fs.readFileSync(htmlPath, 'utf8');
      const idRegex = /id=["']([^"']+)["']/g;
      const ids = [];
      let match;
      while ((match = idRegex.exec(htmlContent)) !== null) {
        ids.push(match[1]);
      }
      
      const uniqueIds = new Set(ids);
      const duplicates = ids.filter((item, index) => ids.indexOf(item) !== index);
      assert.strictEqual(duplicates.length, 0, `Duplicate IDs found: ${JSON.stringify(duplicates)}`);
    });
  });

  test.describe('DOM Structure and Accessibility Checks', () => {
    test('1. Main semantic tags are present', async () => {
      const mainTags = ['header', 'main', 'footer', 'nav'];
      for (const tag of mainTags) {
        const count = await page.$$eval(tag, el => el.length);
        assert.ok(count > 0, `Semantic tag <${tag}> must be present in the document`);
      }
    });

    test('2. HTML structural hierarchy (header/footer/main are not nested inside each other)', async () => {
      const headerInsideMain = await page.$$eval('main header', el => el.length);
      const footerInsideMain = await page.$$eval('main footer', el => el.length);
      const mainInsideHeader = await page.$$eval('header main', el => el.length);
      const mainInsideFooter = await page.$$eval('footer main', el => el.length);

      assert.strictEqual(headerInsideMain, 0, '<header> should not be nested inside <main>');
      assert.strictEqual(footerInsideMain, 0, '<footer> should not be nested inside <main>');
      assert.strictEqual(mainInsideHeader, 0, '<main> should not be nested inside <header>');
      assert.strictEqual(mainInsideFooter, 0, '<main> should not be nested inside <footer>');
    });
  });

  test.describe('Service Sections Verification', () => {
    test('1. Verify that all 5 specific services are present', async () => {
      // The 5 services to verify: renovations, fencing, building, flooring, installer
      const expectedServices = [
        { title: 'Renovations', key: 'renovation' },
        { title: 'Fencing', key: 'fencing' },
        { title: 'Building', key: 'building' },
        { title: 'Flooring', key: 'flooring' },
        { title: 'Installer', key: 'installer' }
      ];

      const servicesContainer = await page.$('#services');
      assert.ok(servicesContainer, 'An element with id="services" must exist');

      // Get all card titles or text inside the services section
      const serviceCardTexts = await page.$$eval('#services .service-card, #services article', cards => {
        return cards.map(c => c.textContent);
      });

      assert.ok(serviceCardTexts.length >= 5, `Expected at least 5 service cards/articles, found ${serviceCardTexts.length}`);

      for (const service of expectedServices) {
        const found = serviceCardTexts.some(text => {
          return text.toLowerCase().includes(service.title.toLowerCase()) || 
                 text.toLowerCase().includes(service.key.toLowerCase());
        });
        assert.ok(found, `Service "${service.title}" (key: "${service.key}") not found in services section.`);
      }
    });
  });

  test.describe('Contact Form and Field Verification', () => {
    test('1. Contact form exists with correct action and method', async () => {
      const form = await page.$('form#contact-form');
      assert.ok(form, 'A form with id="contact-form" must exist');

      const action = await page.$eval('form#contact-form', el => el.getAttribute('action'));
      const method = await page.$eval('form#contact-form', el => el.getAttribute('method'));

      assert.strictEqual(action, '/api/contact', 'Form action must be "/api/contact"');
      assert.match(method, /post/i, 'Form method must be POST');
    });

    test('2. Form contains required fields (name, email, phone, projectDetails)', async () => {
      const requiredFields = [
        { id: 'name', name: 'name', type: 'text', tagName: 'INPUT' },
        { id: 'email', name: 'email', type: 'email', tagName: 'INPUT' },
        { id: 'phone', name: 'phone', type: 'tel', tagName: 'INPUT' },
        { id: 'projectDetails', name: 'projectDetails', tagName: 'TEXTAREA' }
      ];

      for (const field of requiredFields) {
        const selector = `form#contact-form #${field.id}`;
        const exists = await page.$(selector);
        assert.ok(exists, `Field with id="${field.id}" must exist inside the contact form`);

        const details = await page.$eval(selector, el => ({
          name: el.getAttribute('name'),
          type: el.getAttribute('type'),
          tagName: el.tagName,
          required: el.hasAttribute('required')
        }));

        assert.strictEqual(details.name, field.name, `Field id="${field.id}" must have name="${field.name}"`);
        assert.strictEqual(details.tagName, field.tagName, `Field id="${field.id}" must be a <${field.tagName}> tag`);
        if (field.type) {
          assert.strictEqual(details.type, field.type, `Field id="${field.id}" must be of type="${field.type}"`);
        }
        assert.strictEqual(details.required, true, `Field id="${field.id}" must be marked as required`);
      }
    });
  });

  test.describe('Link Targets and Navigation Verification', () => {
    test('1. Internal link targets exist', async () => {
      // Find all anchors on the page
      const links = await page.$$eval('a', anchors => {
        return anchors.map(a => a.getAttribute('href')).filter(href => href && href.startsWith('#'));
      });

      for (const href of links) {
        if (href === '#' || href === '') continue; // Skip home link placeholders
        
        const targetId = href.substring(1);
        const targetExists = await page.evaluate((id) => {
          return document.getElementById(id) !== null;
        }, targetId);

        assert.ok(targetExists, `Internal link target "${href}" does not match any element ID on the page.`);
      }
    });
  });
});

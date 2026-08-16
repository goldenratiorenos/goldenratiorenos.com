const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');
const { startServer, stopServer, getChromePath, registerBrowser } = require('./test_helper');

test.describe('Milestone M2 HTML Verification', () => {
  let browser = null;
  let page = null;
  let htmlContent = '';
  let port = null;

  test.before(async () => {
    // Read the raw HTML file for static analysis
    const htmlPath = path.join(__dirname, '../public/index.html');
    htmlContent = fs.readFileSync(htmlPath, 'utf8');

    // Start server dynamically
    const proc = await startServer();
    port = proc.port;

    // Launch browser once for all Puppeteer tests
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

  test('1. Static HTML Syntax & Structure Check', () => {
    // Strip comments, script tags, and style tags to prevent nested code from interfering
    const cleanHtml = htmlContent
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, '');

    const tagRegex = /<(\/?)([a-zA-Z0-9:-]+)([^>]*?)>/g;
    const stack = [];
    const voidElements = new Set([
      'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 
      'link', 'meta', 'param', 'source', 'track', 'wbr'
    ]);
    
    let match;
    const errors = [];
    
    while ((match = tagRegex.exec(cleanHtml)) !== null) {
      const isClosing = match[1] === '/';
      const tagName = match[2].toLowerCase();
      const tagContent = match[3];
      const isSelfClosing = tagContent.trim().endsWith('/');
      
      if (voidElements.has(tagName) || isSelfClosing) {
        if (isClosing) {
          errors.push(`Void or self-closing tag '${tagName}' should not have a closing tag.`);
        }
        continue;
      }
      
      if (isClosing) {
        if (stack.length === 0) {
          errors.push(`Unexpected closing tag </${tagName}> without matching open tag.`);
        } else {
          const top = stack.pop();
          if (top.name !== tagName) {
            errors.push(`Mismatched tags: expected </${top.name}> (opened at position ${top.index}), but found </${tagName}> at position ${match.index}.`);
          }
        }
      } else {
        stack.push({ name: tagName, index: match.index });
      }
    }
    
    while (stack.length > 0) {
      const unclosed = stack.pop();
      errors.push(`Unclosed tag <${unclosed.name}> opened at position ${unclosed.index}.`);
    }

    console.log(`Static analysis found ${errors.length} syntax/tag errors.`);
    if (errors.length > 0) {
      errors.forEach(err => console.error(`  - ${err}`));
    }
    
    assert.strictEqual(errors.length, 0, `HTML has structural tag errors:\n${errors.join('\n')}`);
  });

  test('2. Anchor Link Target Verification', async () => {
    const anchors = await page.$$eval('a[href^="#"]', els => {
      return els.map(el => ({
        href: el.getAttribute('href'),
        text: el.textContent.trim(),
        outerHTML: el.outerHTML
      }));
    });

    console.log(`Found ${anchors.length} internal anchor links to verify.`);
    const missingTargets = [];

    for (const anchor of anchors) {
      const targetId = anchor.href.slice(1);
      if (!targetId) {
        continue; // Ignore empty '#' links
      }
      
      const targetExists = await page.evaluate((id) => {
        return document.getElementById(id) !== null;
      }, targetId);

      if (!targetExists) {
        missingTargets.push(anchor);
      }
    }

    if (missingTargets.length > 0) {
      console.warn('WARNING: The following anchor links point to non-existent IDs:');
      missingTargets.forEach(link => {
        console.warn(`  - Link [href="${link.href}"] ("${link.text}")`);
      });
    }

    assert.strictEqual(
      missingTargets.length, 
      0, 
      `Found ${missingTargets.length} broken anchor link targets:\n${missingTargets.map(t => t.outerHTML).join('\n')}`
    );
  });

  test('3. Services Presence Verification', async () => {
    const services = ['renovations', 'fencing', 'building', 'flooring', 'installer'];
    const missingServices = [];

    for (const service of services) {
      const foundInText = await page.evaluate((s) => {
        const bodyText = document.body.textContent.toLowerCase();
        return bodyText.includes(s.toLowerCase());
      }, service);

      if (!foundInText) {
        missingServices.push(service);
      }
    }

    assert.strictEqual(
      missingServices.length, 
      0, 
      `The following services are missing from the page: ${missingServices.join(', ')}`
    );
    console.log('Verified: All 5 services (renovations, fencing, building, flooring, installer) are mentioned.');
  });

  test('4. Contact Form Fields and Attributes Verification', async () => {
    const formExists = await page.evaluate(() => {
      return document.querySelector('form#contact-form') !== null;
    });
    assert.ok(formExists, 'Contact form with ID "contact-form" does not exist.');

    // Check individual form fields
    const expectedFields = [
      { name: 'name', tag: 'input', type: 'text' },
      { name: 'email', tag: 'input', type: 'email' },
      { name: 'phone', tag: 'input', type: 'tel' },
      { name: 'projectDetails', tag: 'textarea', type: null }
    ];

    const errors = [];

    for (const field of expectedFields) {
      const fieldInfo = await page.evaluate((f) => {
        const el = document.querySelector(`form#contact-form [name="${f.name}"]`);
        if (!el) return null;
        return {
          tagName: el.tagName.toLowerCase(),
          type: el.getAttribute('type'),
          id: el.getAttribute('id'),
          required: el.hasAttribute('required')
        };
      }, field);

      if (!fieldInfo) {
        errors.push(`Form field with name="${field.name}" is missing.`);
        continue;
      }

      if (fieldInfo.tagName !== field.tag) {
        errors.push(`Field "${field.name}" is tag <${fieldInfo.tagName}>, expected <${field.tag}>`);
      }

      if (fieldInfo.id !== field.name) {
        errors.push(`Field "${field.name}" should have id="${field.name}", got id="${fieldInfo.id}"`);
      }

      if (!fieldInfo.required) {
        errors.push(`Field "${field.name}" must be required.`);
      }
      
      if (field.type && fieldInfo.type !== field.type) {
        errors.push(`Field "${field.name}" should have type="${field.type}", got type="${fieldInfo.type}"`);
      }
    }

    assert.strictEqual(errors.length, 0, `Contact form verification errors:\n${errors.join('\n')}`);
    console.log('Verified: Contact form exists and contains name, email, phone, and projectDetails fields with correct tags, IDs, types, and required attributes.');
  });
});

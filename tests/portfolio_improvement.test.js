const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const fs = require('node:fs');
const puppeteer = require('puppeteer-core');
const { startServer, stopServer, getChromePath, registerBrowser } = require('./test_helper');

test.describe('Portfolio Accordion & Gallery E2E Tests', () => {
  let port;
  let browser;
  let page;

  test.before(async () => {
    const proc = await startServer();
    port = proc.port;
    browser = await puppeteer.launch({
      executablePath: getChromePath(),
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    registerBrowser(browser);
  });

  test.after(async () => {
    if (browser) {
      await browser.close();
    }
    await stopServer();
  });

  test.beforeEach(async () => {
    page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    await page.goto(`http://localhost:${port}`, { waitUntil: 'domcontentloaded' });
    await new Promise(resolve => setTimeout(resolve, 800));
  });

  test.afterEach(async () => {
    if (page) {
      await page.close();
    }
  });

  test('1. Verify image files exist in public/img/ and load in AccordionGallery', async () => {
    const destDir = path.join(__dirname, '../public/img');
    assert.ok(fs.existsSync(destDir), 'Destination public/img/ directory should exist');

    await page.waitForSelector('.accordion-gallery, .ag-panel');
    const panelImages = await page.$$eval('.ag-panel img', imgs => {
      return imgs.map(img => ({
        src: img.getAttribute('src'),
        complete: img.complete,
        naturalWidth: img.naturalWidth
      }));
    });

    assert.ok(panelImages.length > 0, 'No images found in the AccordionGallery');
    for (const img of panelImages) {
      assert.ok(img.src, `Image must have src`);
      assert.ok(img.complete, `Image ${img.src} was not fully loaded`);
      assert.ok(img.naturalWidth > 0, `Image ${img.src} has naturalWidth of 0 (failed to load/broken)`);
    }
  });

  test('2. Verify AccordionGallery displays panels with active panel expanded', async () => {
    await page.waitForSelector('.accordion-gallery .ag-panel');
    const panelCount = await page.$$eval('.ag-panel', panels => panels.length);
    assert.ok(panelCount >= 4, `Expected at least 4 accordion panels, got ${panelCount}`);

    const activePanel = await page.$('.ag-panel.ag-panel--active, .ag-panel[aria-current="true"]');
    assert.ok(activePanel, 'There should be an active expanded panel on load');
  });

  test('3. Verify hovering/clicking an accordion panel updates the active state', async () => {
    await page.waitForSelector('.ag-panel');

    // Click the first panel
    await page.click('.ag-panel:first-child');
    await new Promise(resolve => setTimeout(resolve, 600));

    const firstActive = await page.$eval('.ag-panel:first-child', el => el.classList.contains('ag-panel--active'));
    assert.ok(firstActive, 'First panel should become active after interaction');
  });

  test('4. Verify AccordionGallery has 3D perspective and labels', async () => {
    const galleryPerspective = await page.$eval('.accordion-gallery', el => {
      const style = window.getComputedStyle(el);
      return style.perspective;
    });

    assert.ok(galleryPerspective && galleryPerspective !== 'none', 'Accordion gallery should have 3D perspective configured');

    const labelCount = await page.$$eval('.ag-panel__label', labels => labels.length);
    assert.ok(labelCount > 0, 'Accordion panels should have labels');
  });

  test('5. Verify clicking an active accordion panel opens Lightbox modal with project details', async () => {
    await page.waitForSelector('.ag-panel');

    // Click to activate and click again to trigger lightbox
    await page.click('.ag-panel:first-child');
    await new Promise(resolve => setTimeout(resolve, 300));
    await page.click('.ag-panel:first-child');

    const lightboxSelector = '#portfolio-lightbox, .lightbox-modal';
    await page.waitForSelector(lightboxSelector, { visible: true });

    const lightboxDetails = await page.evaluate(() => {
      const img = document.querySelector('#lightbox-img');
      const title = document.querySelector('#lightbox-title');
      return {
        src: img ? img.getAttribute('src') : '',
        title: title ? title.textContent.trim() : ''
      };
    });

    assert.ok(lightboxDetails.src, 'Lightbox image src should be populated');
    assert.ok(lightboxDetails.title, 'Lightbox title should be populated');
  });

  test('6. Verify keyboard accessibility (Escape key closes Lightbox modal)', async () => {
    await page.waitForSelector('.ag-panel');

    // Open lightbox
    await page.click('.ag-panel:first-child');
    await new Promise(resolve => setTimeout(resolve, 200));
    await page.click('.ag-panel:first-child');

    const lightboxSelector = '#portfolio-lightbox, .lightbox-modal';
    await page.waitForSelector(lightboxSelector, { visible: true });

    // Press Escape
    await page.keyboard.press('Escape');
    await new Promise(resolve => setTimeout(resolve, 500));

    const isClosed = await page.evaluate((sel) => {
      const el = document.querySelector(sel);
      if (!el) return true;
      const style = window.getComputedStyle(el);
      return style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0' || !el.classList.contains('active');
    }, lightboxSelector);

    assert.ok(isClosed, 'Lightbox modal should be closed after pressing Escape');
  });

  test('7. Verify navigation inside Lightbox (Next/Prev buttons)', async () => {
    await page.waitForSelector('.ag-panel');

    // Open lightbox for a multi-image panel
    await page.click('.ag-panel:nth-child(2)');
    await new Promise(resolve => setTimeout(resolve, 300));
    await page.click('.ag-panel:nth-child(2)');

    const lightboxSelector = '#portfolio-lightbox, .lightbox-modal';
    await page.waitForSelector(lightboxSelector, { visible: true });

    // Click Next
    const nextBtn = await page.$('#lightbox-next');
    if (nextBtn) {
      await page.click('#lightbox-next');
      await new Promise(resolve => setTimeout(resolve, 500));

      const nextSrc = await page.$eval('#lightbox-img', el => el.getAttribute('src'));
      assert.ok(nextSrc, 'Next image should have a valid src');
    }
  });
});

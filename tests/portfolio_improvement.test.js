const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');
const { startServer, stopServer, getChromePath, registerBrowser } = require('./test_helper');

test.describe('Portfolio Improvement E2E Tests', () => {
  let browser = null;
  let page = null;
  let port = null;

  test.before(async () => {
    // Start server dynamically using test helper
    const proc = await startServer();
    port = proc.port;

    // Launch Chrome using test helper paths
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
    await page.goto(`http://localhost:${port}`, { waitUntil: 'domcontentloaded' });
  });

  test.afterEach(async () => {
    if (page) {
      await page.close();
    }
  });

  test('1. Verify image files are successfully copied from img/ to public/img/ and loaded by the page', async () => {
    const srcDir = path.join(__dirname, '../img');
    const destDir = path.join(__dirname, '../public/img');

    // 1. Verify existence of source images in destination directory
    assert.ok(fs.existsSync(srcDir), 'Source img/ directory should exist');
    assert.ok(fs.existsSync(destDir), 'Destination public/img/ directory should exist');

    const destFiles = fs.readdirSync(destDir).filter(f => /\.(jpg|jpeg|png|gif)$/i.test(f));
    assert.ok(destFiles.length > 0, 'Destination public/img/ directory should contain images');

    // 2. Verify all images in portfolio grid are successfully loaded by the page
    const pageImages = await page.$$eval('#portfolio-grid img, .portfolio-grid img', imgs => {
      return imgs.map(img => ({
        src: img.getAttribute('src'),
        complete: img.complete,
        naturalWidth: img.naturalWidth
      }));
    });

    assert.ok(pageImages.length > 0, 'No images found in the portfolio grid');
    console.log(`Checking loading status for ${pageImages.length} portfolio images...`);
    for (const img of pageImages) {
      assert.ok(img.complete, `Image ${img.src} was not fully loaded`);
      assert.ok(img.naturalWidth > 0, `Image ${img.src} has naturalWidth of 0 (failed to load/broken)`);
    }
  });

  test('2. Verify that initial portfolio view displays exactly 8 items under "All Projects"', async () => {
    // Verify "All Projects" is the active filter button
    const activeFilterText = await page.evaluate(() => {
      const activeBtn = document.querySelector('.filter-btn.active, [data-filter="all"].active');
      return activeBtn ? activeBtn.textContent.trim() : null;
    });
    assert.match(activeFilterText || '', /All Projects/i, 'Active filter button should be "All Projects"');

    // Count visible portfolio items
    const visibleCount = await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll('.portfolio-item, .portfolio-card'));
      return items.filter(item => {
        const style = window.getComputedStyle(item);
        return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
      }).length;
    });

    assert.strictEqual(visibleCount, 8, `Expected exactly 8 visible portfolio items initially, but got ${visibleCount}`);
  });

  test('3. Verify clicking a filter button (fencing) filters grid items', async () => {
    const fencingFilterSelector = '#filter-fencing, [data-filter="fencing"], .filter-btn[data-filter="fencing"]';
    
    // Check if the filter button exists
    const filterExists = await page.evaluate((sel) => !!document.querySelector(sel), fencingFilterSelector);
    assert.ok(filterExists, 'Fencing filter button should exist on the page');

    // Click the fencing filter button
    await page.click(fencingFilterSelector);

    // Wait short delay for any transitions
    await new Promise(resolve => setTimeout(resolve, 500));

    // Get visibility state and categories of all portfolio items
    const items = await page.evaluate(() => {
      const elements = Array.from(document.querySelectorAll('.portfolio-item, .portfolio-card'));
      return elements.map(el => {
        const style = window.getComputedStyle(el);
        return {
          category: el.getAttribute('data-category') || '',
          visible: style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0'
        };
      });
    });

    const visibleItems = items.filter(i => i.visible);
    assert.ok(visibleItems.length > 0, 'Should have at least one visible item after filtering');
    
    // Ensure all visible items have data-category="fencing"
    for (const item of visibleItems) {
      assert.strictEqual(item.category, 'fencing', `Visible item category should be "fencing", but got "${item.category}"`);
    }

    // Ensure non-fencing items are hidden
    const hiddenItems = items.filter(i => !i.visible);
    for (const item of hiddenItems) {
      assert.notStrictEqual(item.category, 'fencing', `Fencing item should not be hidden`);
    }
  });

  test('4. Verify clicking "Load More" dynamically appends 8 more items', async () => {
    // Wait for the portfolio grid to load
    await page.waitForSelector('.portfolio-item, .portfolio-card');

    const loadMoreSelector = '#load-more, .load-more-btn, button.load-more';
    const hasLoadMore = await page.evaluate((sel) => !!document.querySelector(sel), loadMoreSelector);
    assert.ok(hasLoadMore, 'Load More button should exist on the page');

    // Count initial visible items
    const initialVisibleCount = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('.portfolio-item, .portfolio-card'))
        .filter(el => window.getComputedStyle(el).display !== 'none').length;
    });

    // Click Load More
    await page.click(loadMoreSelector);

    // Wait short delay for items to append
    await new Promise(resolve => setTimeout(resolve, 500));

    // Count visible items after load more
    const postVisibleCount = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('.portfolio-item, .portfolio-card'))
        .filter(el => window.getComputedStyle(el).display !== 'none').length;
    });

    assert.strictEqual(postVisibleCount, initialVisibleCount + 8, `Expected visible count to increase by 8 (from ${initialVisibleCount} to ${initialVisibleCount + 8}), but got ${postVisibleCount}`);
  });

  test('5. Verify clicking a portfolio card opens Lightbox modal with correct content', async () => {
    await page.waitForSelector('.portfolio-item, .portfolio-card');

    // Get details from first card
    const firstCardDetails = await page.evaluate(() => {
      const card = document.querySelector('.portfolio-item, .portfolio-card');
      if (!card) return null;
      const img = card.querySelector('img');
      const title = card.querySelector('.project-title, h3, h4');
      const desc = card.querySelector('.project-desc, p');
      return {
        src: img ? img.getAttribute('src') : '',
        title: title ? title.textContent.trim() : '',
        desc: desc ? desc.textContent.trim() : ''
      };
    });

    assert.ok(firstCardDetails, 'Should find at least one portfolio item');

    // Click the first card
    await page.click('.portfolio-item, .portfolio-card');

    // Wait for Lightbox modal
    const lightboxSelector = '#lightbox, .lightbox, .lightbox-modal';
    await page.waitForSelector(lightboxSelector, { visible: true });

    // Verify lightbox contents
    const lightboxDetails = await page.evaluate(() => {
      const img = document.querySelector('#lightbox img, .lightbox img, .lightbox-img, #lightbox-img');
      const title = document.querySelector('#lightbox-title, .lightbox-title, .lightbox-caption, #lightbox .caption');
      const desc = document.querySelector('#lightbox-desc, .lightbox-desc, #lightbox-description, .lightbox-description');
      return {
        src: img ? img.getAttribute('src') : '',
        title: title ? title.textContent.trim() : '',
        desc: desc ? desc.textContent.trim() : ''
      };
    });

    assert.strictEqual(lightboxDetails.src, firstCardDetails.src, 'Lightbox image src should match card image src');
    // Flexible matching for title and description in case of minor formatting variations
    assert.ok(lightboxDetails.title.includes(firstCardDetails.title) || firstCardDetails.title.includes(lightboxDetails.title), `Lightbox title "${lightboxDetails.title}" should match/contain card title "${firstCardDetails.title}"`);
    assert.ok(lightboxDetails.desc.includes(firstCardDetails.desc) || firstCardDetails.desc.includes(lightboxDetails.desc), `Lightbox description "${lightboxDetails.desc}" should match/contain card description "${firstCardDetails.desc}"`);
  });

  test('6. Verify keyboard accessibility (Escape key closes Lightbox modal)', async () => {
    await page.waitForSelector('.portfolio-item, .portfolio-card');

    // Open lightbox
    await page.click('.portfolio-item, .portfolio-card');
    const lightboxSelector = '#lightbox, .lightbox, .lightbox-modal';
    await page.waitForSelector(lightboxSelector, { visible: true });

    // Press Escape
    await page.keyboard.press('Escape');

    // Wait short delay for transition
    await new Promise(resolve => setTimeout(resolve, 500));

    // Verify modal is closed
    const isClosed = await page.evaluate((sel) => {
      const el = document.querySelector(sel);
      if (!el) return true;
      const style = window.getComputedStyle(el);
      return style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0';
    }, lightboxSelector);

    assert.ok(isClosed, 'Lightbox modal should be hidden or closed after pressing Escape');
  });

  test('7. Verify navigation inside Lightbox (Next/Prev buttons)', async () => {
    await page.waitForSelector('.portfolio-item, .portfolio-card');

    // Click a grouped project card (project-hardwood-floor) which is in the first 8
    const clickedCardSrc = await page.evaluate(() => {
      const card = document.querySelector('.portfolio-item[data-project-id="project-hardwood-floor"]');
      if (card) {
        card.click();
        return card.querySelector('img').getAttribute('src');
      }
      return null;
    });

    assert.ok(clickedCardSrc, 'Could not find project-hardwood-floor in the visible grid items');

    const lightboxSelector = '#lightbox, .lightbox, .lightbox-modal, #portfolio-lightbox';
    await page.waitForSelector(lightboxSelector, { visible: true });

    // Wait for transition/update
    await new Promise(resolve => setTimeout(resolve, 500));

    // Find and click Next button
    const nextBtnSelector = '#lightbox-next, .lightbox-next, .next-btn, [data-action="next"]';
    const hasNextBtn = await page.evaluate((sel) => !!document.querySelector(sel), nextBtnSelector);
    assert.ok(hasNextBtn, 'Next button should exist in Lightbox');
    await page.click(nextBtnSelector);

    // Wait for transition/update
    await new Promise(resolve => setTimeout(resolve, 500));

    // Verify lightbox details updated to the second project image
    const nextLightboxDetails = await page.evaluate(() => {
      const img = document.querySelector('#lightbox img, .lightbox img, .lightbox-img, #lightbox-img');
      return img ? img.getAttribute('src') : '';
    });

    assert.notStrictEqual(nextLightboxDetails, clickedCardSrc, 'After Next, Lightbox image src should change to the second project image');

    // Find and click Prev button
    const prevBtnSelector = '#lightbox-prev, .lightbox-prev, .prev-btn, [data-action="prev"]';
    const hasPrevBtn = await page.evaluate((sel) => !!document.querySelector(sel), prevBtnSelector);
    assert.ok(hasPrevBtn, 'Prev button should exist in Lightbox');
    await page.click(prevBtnSelector);

    // Wait for transition/update
    await new Promise(resolve => setTimeout(resolve, 500));

    // Verify lightbox details updated back to the first card
    const prevLightboxDetails = await page.evaluate(() => {
      const img = document.querySelector('#lightbox img, .lightbox img, .lightbox-img, #lightbox-img');
      return img ? img.getAttribute('src') : '';
    });

    assert.strictEqual(prevLightboxDetails, clickedCardSrc, 'After Prev, Lightbox image src should match the original project cover image');
  });
});

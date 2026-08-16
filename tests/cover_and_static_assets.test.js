const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const supertest = require('supertest');
const { startServer, stopServer } = require('./test_helper');

test.describe('Cover Image Selection & Static Asset Serving Tests', () => {
  let port;
  let request;
  const configPath = path.join(__dirname, '../public/js/portfolio-config.json');
  let originalConfigBackup = null;

  test.before(async () => {
    // Backup original portfolio-config.json
    if (fs.existsSync(configPath)) {
      originalConfigBackup = fs.readFileSync(configPath, 'utf8');
    }

    const proc = await startServer();
    port = proc.port;
    request = supertest(`http://localhost:${port}`);
  });

  test.after(async () => {
    await stopServer();

    // Restore original config backup
    if (originalConfigBackup !== null) {
      fs.writeFileSync(configPath, originalConfigBackup, 'utf8');
    }
  });

  test('1. POST /api/projects/cover updates cover image and responds with success', async () => {
    const targetFolder = 'Craftsman Kitchen & Window Millwork';
    const newCover = '30.jpeg';

    const response = await request
      .post('/api/projects/cover')
      .send({ folderName: targetFolder, coverImage: newCover });

    assert.strictEqual(response.status, 200);
    assert.strictEqual(response.body.success, true);
    assert.strictEqual(response.body.folderName, targetFolder);
    assert.strictEqual(response.body.coverImage, newCover);
  });

  test('2. GET /api/projects reflects updated cover image', async () => {
    const targetFolder = 'Craftsman Kitchen & Window Millwork';
    const updatedCover = '30.jpeg';

    const response = await request.get('/api/projects');
    assert.strictEqual(response.status, 200);
    assert.ok(Array.isArray(response.body), 'Response should be an array of projects');

    const project = response.body.find(p => p.folderName === targetFolder);
    assert.ok(project, `Project "${targetFolder}" should be found in GET /api/projects`);
    assert.strictEqual(project.coverImage, updatedCover, 'coverImage in GET /api/projects should reflect updated selection');
  });

  test('3. GET /api/portfolio?format=projects reflects updated cover image', async () => {
    const targetFolder = 'Craftsman Kitchen & Window Millwork';
    const updatedCover = '30.jpeg';

    const response = await request.get('/api/portfolio?format=projects');
    assert.strictEqual(response.status, 200);
    assert.ok(Array.isArray(response.body), 'Response should be an array of projects');

    const project = response.body.find(p => p.folderName === targetFolder);
    assert.ok(project, `Project "${targetFolder}" should be found in GET /api/portfolio?format=projects`);
    assert.strictEqual(project.coverImage, updatedCover, 'coverImage in GET /api/portfolio?format=projects should reflect updated selection');
  });

  test('4. Cover image update cycle across multiple projects with special characters', async () => {
    const testCases = [
      { folderName: 'Artisan Walnut & Hardwood Kitchen', coverImage: '67.jpeg' },
      { folderName: 'Backlit Ledgestone Fireplace Suite', coverImage: '4.jpeg' },
      { folderName: 'Elevated Cedar Deck & Patio Stairs', coverImage: '2.jpeg' }
    ];

    for (const tc of testCases) {
      // 1. Update cover image
      const updateRes = await request
        .post('/api/projects/cover')
        .send({ folderName: tc.folderName, coverImage: tc.coverImage });
      assert.strictEqual(updateRes.status, 200);
      assert.strictEqual(updateRes.body.success, true);

      // 2. Check GET /api/projects
      const projRes = await request.get('/api/projects');
      const proj = projRes.body.find(p => p.folderName === tc.folderName);
      assert.ok(proj, `Project "${tc.folderName}" should exist`);
      assert.strictEqual(proj.coverImage, tc.coverImage);

      // 3. Check GET /api/portfolio?format=projects
      const portRes = await request.get('/api/portfolio?format=projects');
      const portProj = portRes.body.find(p => p.folderName === tc.folderName);
      assert.ok(portProj, `Project "${tc.folderName}" should exist in portfolio`);
      assert.strictEqual(portProj.coverImage, tc.coverImage);
    }
  });

  test('5. Static asset routes serve image files from subdirectories with spaces and special characters', async () => {
    const assetsToTest = [
      { path: '/img/Artisan%20Walnut%20%26%20Hardwood%20Kitchen/67.jpeg', expectedType: 'image/jpeg' },
      { path: '/img/Backlit%20Ledgestone%20Fireplace%20Suite/4.jpeg', expectedType: 'image/jpeg' },
      { path: '/img/Craftsman%20Kitchen%20%26%20Window%20Millwork/30.jpeg', expectedType: 'image/jpeg' },
      { path: '/img/Madani%20Estate%20Backyard%20Pavilion/21.jpeg', expectedType: 'image/jpeg' },
      { path: '/img/Elevated%20Cedar%20Deck%20%26%20Patio%20Stairs/2.jpeg', expectedType: 'image/jpeg' },
      { path: '/img/Executive%20Double-Sink%20Master%20Vanity/22.jpeg', expectedType: 'image/jpeg' },
      { path: '/img/portfolio_kitchen.png', expectedType: 'image/png' }
    ];

    for (const asset of assetsToTest) {
      const res = await request.get(asset.path);
      assert.strictEqual(res.status, 200, `Asset ${asset.path} should return HTTP 200`);
      assert.ok(res.headers['content-type'].includes(asset.expectedType), `Asset ${asset.path} content-type should contain ${asset.expectedType}`);
      assert.ok(parseInt(res.headers['content-length'], 10) > 0, `Asset ${asset.path} should have non-zero content-length`);
    }
  });

  test('6. Validation & error handling for POST /api/projects/cover', async () => {
    // Missing folderName
    const res1 = await request.post('/api/projects/cover').send({ coverImage: '21.jpeg' });
    assert.strictEqual(res1.status, 400);
    assert.strictEqual(res1.body.success, false);

    // Missing coverImage
    const res2 = await request.post('/api/projects/cover').send({ folderName: 'Madani Estate Backyard Pavilion' });
    assert.strictEqual(res2.status, 400);
    assert.strictEqual(res2.body.success, false);

    // Invalid data types
    const res3 = await request.post('/api/projects/cover').send({ folderName: 123, coverImage: '21.jpeg' });
    assert.strictEqual(res3.status, 400);
    assert.strictEqual(res3.body.success, false);
  });

  test('7. Edge case handling for non-existent static asset paths and directory traversal security', async () => {
    // Non-existent image file
    const res1 = await request.get('/img/Artisan%20Walnut%20%26%20Hardwood%20Kitchen/nonexistent_image.jpeg');
    assert.strictEqual(res1.status, 404);

    // Directory traversal attempt
    const res2 = await request.get('/img/../server.js');
    assert.ok(res2.status === 404 || res2.status === 403, `Directory traversal attempt should be rejected with 404 or 403 (got ${res2.status})`);
  });
});

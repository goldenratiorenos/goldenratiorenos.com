const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const supertest = require('supertest');
const { startServer, stopServer } = require('./test_helper');

test.describe('Dynamic Portfolio & Project Management API Tests', () => {
  let port;
  let request;

  test.before(async () => {
    const proc = await startServer();
    port = proc.port;
    request = supertest(`http://localhost:${port}`);
  });

  test.after(async () => {
    await stopServer();
  });

  test('1. Verify GET /api/projects returns dynamic project list from disk', async () => {
    const response = await request.get('/api/projects');
    assert.strictEqual(response.status, 200);
    assert.ok(Array.isArray(response.body), 'Response should be an array of projects');
    assert.strictEqual(response.body.length, 19, 'Expected exactly 19 project folders');

    // Check project structure
    const firstProj = response.body[0];
    assert.ok(firstProj.folderName, 'Project should have folderName');
    assert.ok(firstProj.title, 'Project should have title');
    assert.ok(firstProj.category, 'Project should have category');
    assert.ok(Array.isArray(firstProj.images), 'Project should have images array');
  });

  test('2. Verify GET /api/portfolio returns dynamic flat image items', async () => {
    const response = await request.get('/api/portfolio');
    assert.strictEqual(response.status, 200);
    assert.ok(Array.isArray(response.body), 'Response should be an array');
    assert.ok(response.body.length > 0, 'Portfolio images should not be empty');

    const firstItem = response.body[0];
    assert.ok(firstItem.id, 'Item should have id');
    assert.ok(firstItem.filename, 'Item should have filename');
    assert.ok(firstItem.category, 'Item should have category');
    assert.ok(firstItem.title, 'Item should have title');
  });

  test('3. Verify folder renaming via POST /api/projects/rename updates disk immediately', async () => {
    const imgDir = path.join(__dirname, '../public/img');
    const originalFolder = 'Gourmet Chef Kitchen';
    const tempFolder = 'Gourmet Chef Test Kitchen';

    const originalPath = path.join(imgDir, originalFolder);
    const tempPath = path.join(imgDir, tempFolder);

    assert.ok(fs.existsSync(originalPath), `Original folder "${originalFolder}" should exist on disk`);

    // Perform rename
    const renameRes = await request
      .post('/api/projects/rename')
      .send({ oldName: originalFolder, newName: tempFolder });

    assert.strictEqual(renameRes.status, 200);
    assert.strictEqual(renameRes.body.success, true);

    // Verify disk state immediately
    assert.strictEqual(fs.existsSync(tempPath), true, 'Renamed folder should exist on disk immediately');
    assert.strictEqual(fs.existsSync(originalPath), false, 'Original folder name should no longer exist');

    // Verify API reflects renamed folder
    const apiRes = await request.get('/api/projects');
    const foundRenamed = apiRes.body.find(p => p.folderName === tempFolder);
    assert.ok(foundRenamed, 'Renamed folder should be present in /api/projects response');

    // Clean up: rename back to original
    const rollbackRes = await request
      .post('/api/projects/rename')
      .send({ oldName: tempFolder, newName: originalFolder });

    assert.strictEqual(rollbackRes.status, 200);
    assert.strictEqual(fs.existsSync(originalPath), true, 'Original folder should be restored on disk');
  });

  test('4. Verify cover image selection via POST /api/projects/cover', async () => {
    const targetFolder = 'Madani Estate Backyard Pavilion';
    const newCover = '21.jpeg';

    const res = await request
      .post('/api/projects/cover')
      .send({ folderName: targetFolder, coverImage: newCover });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);

    // Verify via GET /api/projects
    const apiRes = await request.get('/api/projects');
    const project = apiRes.body.find(p => p.folderName === targetFolder);
    assert.ok(project, 'Target project should exist');
    assert.strictEqual(project.coverImage, newCover, 'Cover image should match updated preference');
  });
});

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const supertest = require('supertest');
const { startServer, stopServer } = require('./test_helper');

test.describe('Empirical Folder Renaming & API Stress Tests', () => {
  let port;
  let request;
  const imgDir = path.join(__dirname, '../public/img');
  const testFolder = 'Empirical Test Project Folder';
  const testFolderPath = path.join(imgDir, testFolder);

  function ensureTestFolderExists() {
    if (!fs.existsSync(testFolderPath)) {
      fs.mkdirSync(testFolderPath, { recursive: true });
    }
    const sampleImg = path.join(testFolderPath, '1.jpg');
    if (!fs.existsSync(sampleImg)) {
      fs.writeFileSync(sampleImg, 'dummy image content');
    }
  }

  function cleanupTestFolder() {
    const toClean = [
      testFolderPath,
      path.join(imgDir, 'Empirical Test Project Folder Renamed'),
      path.join(imgDir, 'Empirical Test Project Folder Alias Renamed'),
      path.join(__dirname, '../public/escaped_empirical_project'),
      path.join(imgDir, 'hacked_public')
    ];
    for (const p of toClean) {
      if (fs.existsSync(p)) {
        fs.rmSync(p, { recursive: true, force: true });
      }
    }
  }

  test.before(async () => {
    cleanupTestFolder();
    const proc = await startServer();
    port = proc.port;
    request = supertest(`http://localhost:${port}`);
  });

  test.after(async () => {
    await stopServer();
    cleanupTestFolder();
  });

  test('1. Happy Path: Rename project folder via POST /api/projects/rename and verify live update without server restart', async () => {
    ensureTestFolderExists();
    const tempFolder = 'Empirical Test Project Folder Renamed';
    const tempPath = path.join(imgDir, tempFolder);

    try {
      assert.strictEqual(fs.existsSync(testFolderPath), true, 'Original test folder must exist before rename');
      assert.strictEqual(fs.existsSync(tempPath), false, 'Target test folder must not exist before rename');

      // 1. Send rename request
      const renameRes = await request
        .post('/api/projects/rename')
        .send({ oldName: testFolder, newName: tempFolder });

      assert.strictEqual(renameRes.status, 200);
      assert.strictEqual(renameRes.body.success, true);
      assert.strictEqual(renameRes.body.oldName, testFolder);
      assert.strictEqual(renameRes.body.newName, tempFolder);

      // 2. Direct filesystem check
      assert.strictEqual(fs.existsSync(tempPath), true, 'Disk folder name should be updated instantly');
      assert.strictEqual(fs.existsSync(testFolderPath), false, 'Old disk folder should no longer exist');

      // 3. Instant GET /api/projects without server restart
      const getRes = await request.get('/api/projects');
      assert.strictEqual(getRes.status, 200);
      assert.ok(Array.isArray(getRes.body));

      const foundNew = getRes.body.find(p => p.folderName === tempFolder);
      const foundOld = getRes.body.find(p => p.folderName === testFolder);
      assert.ok(foundNew, 'GET /api/projects must return the newly renamed folder');
      assert.strictEqual(foundOld, undefined, 'GET /api/projects must no longer contain the old folder name');

      // 4. Rename back to original to keep disk state consistent
      const rollbackRes = await request
        .post('/api/projects/rename')
        .send({ oldName: tempFolder, newName: testFolder });

      assert.strictEqual(rollbackRes.status, 200);
      assert.strictEqual(rollbackRes.body.success, true);
      assert.strictEqual(fs.existsSync(testFolderPath), true, 'Original folder should be restored on disk');
      assert.strictEqual(fs.existsSync(tempPath), false, 'Temp folder should no longer exist');

      // Verify GET /api/projects after rollback
      const getRollbackRes = await request.get('/api/projects');
      const restoredProj = getRollbackRes.body.find(p => p.folderName === testFolder);
      assert.ok(restoredProj, 'GET /api/projects must reflect restored folder name');
    } finally {
      cleanupTestFolder();
    }
  });

  test('2. Happy Path: Rename project folder via alias POST /api/portfolio/folder/rename with oldFolderName/newFolderName keys', async () => {
    ensureTestFolderExists();
    const tempFolder = 'Empirical Test Project Folder Alias Renamed';
    const tempPath = path.join(imgDir, tempFolder);

    try {
      assert.strictEqual(fs.existsSync(testFolderPath), true);

      const renameRes = await request
        .post('/api/portfolio/folder/rename')
        .send({ oldFolderName: testFolder, newFolderName: tempFolder });

      assert.strictEqual(renameRes.status, 200);
      assert.strictEqual(renameRes.body.success, true);

      assert.strictEqual(fs.existsSync(tempPath), true);
      assert.strictEqual(fs.existsSync(testFolderPath), false);

      // Rollback
      const rollbackRes = await request
        .post('/api/portfolio/folder/rename')
        .send({ oldFolderName: tempFolder, newFolderName: testFolder });

      assert.strictEqual(rollbackRes.status, 200);
      assert.strictEqual(fs.existsSync(testFolderPath), true);
    } finally {
      cleanupTestFolder();
    }
  });

  test('3. Edge Case: Renaming non-existent folder returns 404', async () => {
    const res = await request
      .post('/api/projects/rename')
      .send({ oldName: 'NonExistentFolder_99999', newName: 'NewFolder_99999' });

    assert.strictEqual(res.status, 404);
    assert.strictEqual(res.body.success, false);
    assert.match(res.body.message, /does not exist/i);
  });

  test('4. Edge Case: Invalid or missing parameter validation', async () => {
    // Missing oldName
    const res1 = await request.post('/api/projects/rename').send({ newName: 'NewName' });
    assert.strictEqual(res1.status, 400);

    // Missing newName
    const res2 = await request.post('/api/projects/rename').send({ oldName: 'Gourmet Chef Kitchen' });
    assert.strictEqual(res2.status, 400);

    // Empty string oldName
    const res3 = await request.post('/api/projects/rename').send({ oldName: '', newName: 'NewName' });
    assert.strictEqual(res3.status, 400);

    // Whitespace newName
    const res4 = await request.post('/api/projects/rename').send({ oldName: 'Gourmet Chef Kitchen', newName: '   ' });
    assert.strictEqual(res4.status, 400);

    // Non-string oldName
    const res5 = await request.post('/api/projects/rename').send({ oldName: 12345, newName: 'NewName' });
    assert.strictEqual(res5.status, 400);
  });

  test('5. Edge Case: Target folder already exists', async () => {
    const res = await request
      .post('/api/projects/rename')
      .send({ oldName: 'Gourmet Chef Kitchen', newName: 'Luxury Spa Guest Bathroom' });

    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.success, false);
    assert.match(res.body.message, /already exists/i);
  });

  test('6. Edge Case: Same oldName and newName (no-op)', async () => {
    const res = await request
      .post('/api/projects/rename')
      .send({ oldName: 'Gourmet Chef Kitchen', newName: 'Gourmet Chef Kitchen' });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.match(res.body.message, /unchanged/i);
  });

  test('7. Security / Edge Case: Path traversal checks', async () => {
    ensureTestFolderExists();

    try {
      // 7a. Path traversal in oldName targeting parent directory
      const resOld = await request
        .post('/api/projects/rename')
        .send({ oldName: '../public', newName: 'hacked_public' });

      assert.notStrictEqual(resOld.status, 200, 'Server should not allow renaming parent directories via path traversal in oldName');

      // 7b. Path traversal in newName attempting to create folder outside IMG_DIR
      const resNew = await request
        .post('/api/projects/rename')
        .send({ oldName: testFolder, newName: '../escaped_empirical_project' });

      if (resNew.status === 200) {
        // Clean up if path traversal actually succeeded
        await request
          .post('/api/projects/rename')
          .send({ oldName: '../escaped_empirical_project', newName: testFolder });
        cleanupTestFolder();
        assert.fail('VULNERABILITY: Path traversal in newName allowed folder creation outside IMG_DIR!');
      } else {
        assert.notStrictEqual(resNew.status, 200, 'Server should reject newName containing path traversal');
      }
    } finally {
      cleanupTestFolder();
    }
  });
});

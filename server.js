const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();

const PORT = process.env.PORT || 3000;

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files hosting
app.use(express.static(path.join(__dirname, 'public')));

// Paths
const IMG_DIR = path.join(__dirname, 'public/img');
const CONFIG_PATH = path.join(__dirname, 'public/js/portfolio-config.json');
const DATA_PATH = path.join(__dirname, 'public/js/portfolio-data.js');

// Helper to read configuration
function getPortfolioConfig() {
  if (fs.existsSync(CONFIG_PATH)) {
    try {
      const content = fs.readFileSync(CONFIG_PATH, 'utf8');
      const parsed = JSON.parse(content);
      if (parsed && typeof parsed === 'object') {
        if (!parsed.projects || typeof parsed.projects !== 'object') {
          parsed.projects = {};
        }
        return parsed;
      }
    } catch (err) {
      console.error('Error reading portfolio-config.json:', err.message);
    }
  }
  return { projects: {} };
}

// Save configuration file
function savePortfolioConfig(config) {
  try {
    const dir = path.dirname(CONFIG_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf8');
  } catch (err) {
    console.error('Error saving portfolio-config.json:', err.message);
  }
}

// Helper to dynamically scan public/img and return project list
function getDynamicProjects() {
  const config = getPortfolioConfig();
  const projects = [];

  if (!fs.existsSync(IMG_DIR)) {
    return projects;
  }

  const entries = fs.readdirSync(IMG_DIR, { withFileTypes: true });
  const subdirs = entries.filter(e => e.isDirectory() && !e.name.startsWith('.')).map(e => e.name).sort();

  const projectsObj = (config && typeof config.projects === 'object' && config.projects !== null) ? config.projects : {};

  for (const folderName of subdirs) {
    const folderPath = path.join(IMG_DIR, folderName);
    let files = [];
    try {
      files = fs.readdirSync(folderPath)
        .filter(f => typeof f === 'string' && /\.(jpg|jpeg|png|webp)$/i.test(f))
        .sort();
    } catch (err) {
      files = [];
    }

    const projConfig = (projectsObj[folderName] && typeof projectsObj[folderName] === 'object' && projectsObj[folderName] !== null) ? projectsObj[folderName] : {};
    const title = (typeof projConfig.title === 'string' && projConfig.title) ? projConfig.title : folderName;
    const category = (typeof projConfig.category === 'string' && projConfig.category) ? projConfig.category : 'renovations';
    const description = (typeof projConfig.description === 'string') ? projConfig.description : '';
    const legacyProjectId = projConfig.legacyProjectId || null;
    const projectId = legacyProjectId || folderName;

    // Resolve cover image
    let coverImage = (typeof projConfig.coverImage === 'string') ? projConfig.coverImage : null;
    if (!coverImage || (!files.includes(coverImage) && !fs.existsSync(path.join(IMG_DIR, coverImage)))) {
      coverImage = files.length > 0 ? files[0] : 'portfolio_kitchen.png';
    }

    const projectImages = files.map(file => {
      return {
        filename: `${folderName}/${file}`,
        file: file,
        folderName: folderName,
        category: category,
        title: title,
        alt: `${title} - ${file}`,
        description: description,
        projectId: projectId
      };
    });

    if (projectImages.length === 0) {
      projectImages.push({
        filename: coverImage || 'portfolio_kitchen.png',
        file: coverImage || 'portfolio_kitchen.png',
        folderName: folderName,
        category: category,
        title: title,
        alt: title,
        description: description,
        projectId: projectId
      });
    }

    projects.push({
      id: projectId,
      projectId: projectId,
      folderName: folderName,
      title: title,
      category: category,
      coverImage: coverImage,
      description: description,
      images: projectImages
    });
  }

  return projects;
}

// Contact form API route
app.post('/api/contact', (req, res) => {
  const { name, email, phone, projectDetails, recipient } = req.body;
  const targetRecipient = recipient || 'narminbm@gmail.com';

  // Validate fields
  if (!name || typeof name !== 'string' || name.trim() === '') {
    return res.status(400).json({
      success: false,
      message: 'Name is required and must be a non-empty string.'
    });
  }

  if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({
      success: false,
      message: 'A valid email is required.'
    });
  }

  if (!phone || typeof phone !== 'string' || phone.trim() === '') {
    return res.status(400).json({
      success: false,
      message: 'Phone number is required.'
    });
  }

  if (!projectDetails || typeof projectDetails !== 'string' || projectDetails.trim() === '') {
    return res.status(400).json({
      success: false,
      message: 'Project details are required.'
    });
  }

  console.log(`[Contact Form] New lead received for ${targetRecipient}: from ${name} (${email}, ${phone})`);

  return res.status(200).json({
    success: true,
    message: 'Thank you, your request has been received!'
  });
});

// GET /api/projects - Dynamic project scanning endpoint
app.get('/api/projects', (req, res) => {
  try {
    const projects = getDynamicProjects();
    res.json(projects);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/portfolio - Portfolio items endpoint
app.get('/api/portfolio', (req, res) => {
  try {
    if (req.query.format === 'projects') {
      const projects = getDynamicProjects();
      return res.json(projects);
    }
    const projects = getDynamicProjects();
    const flatImages = [];
    let idCounter = 1;
    for (const p of projects) {
      if (p.images && p.images.length > 0) {
        for (const img of p.images) {
          flatImages.push({
            id: idCounter++,
            filename: img.filename,
            category: img.category || p.category,
            title: img.title || p.title,
            alt: img.alt || p.title,
            description: img.description || p.description,
            projectId: p.projectId || p.id
          });
        }
      }
    }
    res.json(flatImages);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/portfolio - Save updated portfolio metadata
app.post('/api/portfolio', (req, res) => {
  try {
    const payload = req.body;
    if (Array.isArray(payload)) {
      for (const img of payload) {
        if (!img.id || !img.filename || !img.category || !img.title || img.alt === undefined || img.description === undefined || !img.projectId) {
          return res.status(400).json({ success: false, message: 'Invalid image item: missing fields' });
        }
      }
      const fileContent = `// Auto-generated portfolio data\nconst PORTFOLIO_IMAGES = ${JSON.stringify(payload, null, 2)};\n\nif (typeof module !== 'undefined' && module.exports) {\n  module.exports = PORTFOLIO_IMAGES;\n}\n`;
      fs.writeFileSync(DATA_PATH, fileContent, 'utf8');
      return res.json({ success: true, message: 'Portfolio updated successfully!' });
    } else if (payload && typeof payload === 'object' && payload.projects) {
      const config = getPortfolioConfig();
      config.projects = payload.projects;
      savePortfolioConfig(config);
      return res.json({ success: true, message: 'Portfolio updated successfully!' });
    }

    return res.status(400).json({ success: false, message: 'Invalid payload: expected an array or project object.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/projects/rename or /api/portfolio/folder/rename - Renames folder on disk immediately
const renameFolderHandler = (req, res) => {
  try {
    const oldName = req.body.oldName || req.body.oldFolderName;
    const newName = req.body.newName || req.body.newFolderName;

    if (!oldName || typeof oldName !== 'string' || !oldName.trim()) {
      return res.status(400).json({ success: false, message: 'oldName is required.' });
    }
    if (!newName || typeof newName !== 'string' || !newName.trim()) {
      return res.status(400).json({ success: false, message: 'newName is required.' });
    }

    const trimmedOld = oldName.trim();
    const trimmedNew = newName.trim();

    // Sanitize and validate path traversal
    const resolvedImgDir = path.resolve(IMG_DIR);
    const resolvedOld = path.resolve(IMG_DIR, trimmedOld);
    const resolvedNew = path.resolve(IMG_DIR, trimmedNew);

    if (
      trimmedOld.includes('/') || trimmedOld.includes('\\') || trimmedOld.includes('..') ||
      trimmedNew.includes('/') || trimmedNew.includes('\\') || trimmedNew.includes('..') ||
      !resolvedOld.startsWith(resolvedImgDir + path.sep) ||
      !resolvedNew.startsWith(resolvedImgDir + path.sep)
    ) {
      return res.status(400).json({ success: false, message: 'Invalid folder name or path traversal attempted.' });
    }

    if (trimmedOld === trimmedNew) {
      return res.json({ success: true, message: 'Folder name unchanged.', oldName: trimmedOld, newName: trimmedNew });
    }

    const oldPath = path.join(IMG_DIR, trimmedOld);
    const newPath = path.join(IMG_DIR, trimmedNew);

    if (!fs.existsSync(oldPath)) {
      return res.status(404).json({ success: false, message: `Folder "${trimmedOld}" does not exist on disk.` });
    }

    if (fs.existsSync(newPath) && trimmedOld.toLowerCase() !== trimmedNew.toLowerCase()) {
      return res.status(400).json({ success: false, message: `Target folder "${trimmedNew}" already exists.` });
    }

    // Windows atomic 2-pass rename to prevent case-insensitivity lock
    const tempPath = path.join(IMG_DIR, `__temp_rename_${Date.now()}`);
    fs.renameSync(oldPath, tempPath);
    fs.renameSync(tempPath, newPath);

    // Update portfolio-config.json
    const config = getPortfolioConfig();
    if (!config.projects || typeof config.projects !== 'object') config.projects = {};
    const existingConfig = (config.projects[trimmedOld] && typeof config.projects[trimmedOld] === 'object')
      ? config.projects[trimmedOld]
      : {
          title: trimmedNew,
          category: 'renovations',
          description: ''
        };
    delete config.projects[trimmedOld];
    existingConfig.title = trimmedNew;
    config.projects[trimmedNew] = existingConfig;

    savePortfolioConfig(config);

    return res.json({
      success: true,
      message: `Folder successfully renamed from "${trimmedOld}" to "${trimmedNew}" on disk!`,
      oldName: trimmedOld,
      newName: trimmedNew
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

app.post('/api/projects/rename', renameFolderHandler);
app.post('/api/portfolio/folder/rename', renameFolderHandler);

// POST /api/projects/cover - Update cover image selection for a project
app.post('/api/projects/cover', (req, res) => {
  try {
    const folderName = req.body.folderName || req.body.projectId;
    const coverImage = req.body.coverImage;

    if (!folderName || typeof folderName !== 'string') {
      return res.status(400).json({ success: false, message: 'folderName is required.' });
    }
    if (!coverImage || typeof coverImage !== 'string') {
      return res.status(400).json({ success: false, message: 'coverImage is required.' });
    }

    const config = getPortfolioConfig();
    if (!config.projects) config.projects = {};
    if (!config.projects[folderName]) {
      config.projects[folderName] = {
        title: folderName,
        category: 'renovations',
        description: ''
      };
    }

    config.projects[folderName].coverImage = coverImage;
    savePortfolioConfig(config);

    return res.json({
      success: true,
      message: `Cover image updated for "${folderName}"!`,
      folderName,
      coverImage
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Start the server if executed directly
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

module.exports = app;

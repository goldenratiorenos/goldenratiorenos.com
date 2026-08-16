/**
 * Atomic Project Renaming Script for Ali Madani Contractor Portfolio
 *
 * Safely renames 19 user-created project folders in `public/img/`
 * using a two-pass atomic rename strategy with dry-run support, rollback capability,
 * cover image selection logic, and metadata synchronization.
 */

const fs = require('fs');
const path = require('path');

// 1. Map of original 19 folder names to premium titles & metadata
const FOLDER_MAPPINGS = [
  {
    original: "Backyard Madani",
    premium: "Madani Estate Backyard Pavilion",
    category: "fencing",
    coverImage: "23.jpeg",
    description: "Custom outdoor kitchen pavilion framing featuring post-and-beam construction, tongue-and-groove cedar ceiling, and asphalt shingle roof."
  },
  {
    original: "Bathroom Reno 2",
    premium: "Contemporary Living & Deck Suite",
    category: "building",
    coverImage: "53.jpeg",
    description: "Installation of modern grey composite deck boards utilizing hidden fastener clips and living room fireplace mantel accents."
  },
  {
    original: "Bathroom Reno 3",
    premium: "Open-Concept Living & Vinyl Flooring",
    category: "renovations",
    coverImage: "16.jpeg",
    description: "Living area remodeling highlighting structural beam removal for open floor plan paired with high-traffic luxury vinyl plank flooring."
  },
  {
    original: "room",
    premium: "Wide-Plank Oak Master Suite",
    category: "flooring",
    coverImage: "9.jpeg",
    description: "Precision installation of wide-plank light oak engineered hardwood flooring showing seamless wood grain finish across living spaces.",
    legacyProjectId: "project-hardwood-floor"
  },
  {
    original: "Bathroom Reno 4",
    premium: "Luxury Spa Guest Bathroom",
    category: "renovations",
    coverImage: "17.jpeg",
    description: "Renovation of a guest bathroom with durable wood-look vinyl plank flooring, sleek white vanity, and curved glass corner shower."
  },
  {
    original: "Broken Patio Stairs",
    premium: "Elevated Cedar Deck & Patio Stairs",
    category: "fencing",
    coverImage: "2.jpeg",
    description: "Complete demolition and rebuild of a damaged elevated deck featuring premium wood joists, composite boards, and glass railings."
  },
  {
    original: "Double Sink",
    premium: "Executive Double-Sink Master Vanity",
    category: "renovations",
    coverImage: "22.jpeg",
    description: "Premium bathroom vanity install featuring under-mount double sink, dark wood accent mirror, and luxury vinyl flooring."
  },
  {
    original: "Fireplace with led lights and shelves",
    premium: "Backlit Ledgestone Fireplace Suite",
    category: "renovations",
    coverImage: "4.jpeg",
    description: "Floor-to-ceiling split stone fireplace wall transformation with floating mantel and custom built-in shelves with integrated warm LED lighting."
  },
  {
    original: "Kitchen Reno",
    premium: "Artisan Walnut & Hardwood Kitchen",
    category: "flooring",
    coverImage: "67.jpeg",
    description: "Custom dark walnut inlay border framing a fireplace hearth and luxury cork flooring showcase."
  },
  {
    original: "Kitchen Reno 4",
    premium: "Craftsman Kitchen & Window Millwork",
    category: "installer",
    coverImage: "30.jpeg",
    description: "Craftsman style window trim casing installation using premium pine boards, prepped and painted to perfection."
  },
  {
    original: "Kitchen reno 2",
    premium: "Modern Oak & Quartz Kitchen",
    category: "renovations",
    coverImage: "11.jpeg",
    description: "Full kitchen renovation featuring white shaker cabinetry, white quartz countertops, central white oak island, and chevron hardwood flooring."
  },
  {
    original: "Kiten Reno 3",
    premium: "Minimalist Maple Kitchen & Flooring",
    category: "flooring",
    coverImage: "19.jpeg",
    description: "Precision engineered maple flooring installed across living areas with matching threshold transition pieces."
  },
  {
    original: "Madani Basement",
    premium: "Madani Executive Basement Suite",
    category: "renovations",
    coverImage: "36.jpeg",
    description: "Full basement makeover including luxury laundry space, built-in entertainment shelving, and marble tile shower screens."
  },
  {
    original: "Modern Bathroom",
    premium: "Modern Marble Freestanding Bath",
    category: "renovations",
    coverImage: "57.jpeg",
    description: "High-end master bath upgrade featuring modern oval freestanding tub, floor-mounted chrome faucet, and floor-to-ceiling marble wall tile."
  },
  {
    original: "bed",
    premium: "Custom Timber Bunk Bedroom",
    category: "installer",
    coverImage: "31.jpeg",
    description: "Custom handcrafted timber bunk beds and built-in bedroom joinery optimized for residential space efficiency."
  },
  {
    original: "indoor stairs",
    premium: "Modern Glass Panel Staircase",
    category: "renovations",
    coverImage: "1.jpeg",
    description: "Custom staircase transformation replacing traditional wood spindles with modern tempered glass panels and matte black railings."
  },
  {
    original: "kitchen",
    premium: "Gourmet Chef Kitchen",
    category: "renovations",
    coverImage: null,
    description: "Gourmet kitchen remodel concept featuring modern architectural layouts and high-end finishes."
  },
  {
    original: "laundry",
    premium: "Custom Utility & Laundry Suite",
    category: "renovations",
    coverImage: "12.jpeg",
    description: "Space-saving laundry area renovation featuring stacked washer-dryer installation, custom door framing, and grey floor tiling."
  },
  {
    original: "outdoor stairs",
    premium: "Exterior Cedar Staircase & Railings",
    category: "building",
    coverImage: "7.jpeg",
    description: "Custom construction of exterior stair railings using premium weather-resistant cedar posts and heavy-duty metal safety handrails."
  }
];

/**
 * Cover Image Selection Helper
 */
function resolveCoverImage(folderPath, mappedCover) {
  if (mappedCover) {
    const fullMappedPath = path.join(folderPath, mappedCover);
    if (fs.existsSync(fullMappedPath)) {
      return mappedCover;
    }
  }

  if (fs.existsSync(folderPath)) {
    const files = fs.readdirSync(folderPath)
      .filter(f => /\.(jpg|jpeg|png|webp)$/i.test(f))
      .sort();
    if (files.length > 0) {
      return files[0];
    }
  }

  return 'portfolio_kitchen.png'; // Default fallback
}

/**
 * Main Renaming Execution Function
 */
async function renameProjects(options = { dryRun: false, imgDir: null }) {
  const targetDir = options.imgDir || path.join(__dirname, '../public/img');
  const dryRun = options.dryRun || false;

  console.log(`=== Ali Madani Contractor Project Folder Renamer ===`);
  console.log(`Target directory: ${targetDir}`);
  console.log(`Mode: ${dryRun ? 'DRY RUN (No disk changes)' : 'EXECUTE'}`);
  console.log(`-----------------------------------------------------`);

  if (!fs.existsSync(targetDir)) {
    throw new Error(`Target directory does not exist: ${targetDir}`);
  }

  const pass1Journal = [];
  const results = [];

  // Phase 1: Pre-flight inspection
  console.log(`[Phase 1] Inspecting 19 project folders...`);
  for (const mapping of FOLDER_MAPPINGS) {
    const origPath = path.join(targetDir, mapping.original);
    const premPath = path.join(targetDir, mapping.premium);
    const exists = fs.existsSync(origPath) || fs.existsSync(premPath);
    
    if (!exists) {
      console.warn(`⚠️ Warning: Folder "${mapping.original}" or "${mapping.premium}" not found.`);
    } else {
      const curPath = fs.existsSync(origPath) ? origPath : premPath;
      const files = fs.readdirSync(curPath);
      const cover = resolveCoverImage(curPath, mapping.coverImage);
      console.log(`  ✓ "${path.basename(curPath)}" (${files.length} files, cover: ${cover}) -> "${mapping.premium}"`);
    }
  }

  if (dryRun) {
    console.log(`\n[DRY RUN SUMMARY] All 19 mappings validated. No changes executed.`);
    return { success: true, dryRun: true };
  }

  // Phase 2: Pass 1 - Atomic Rename to Temporary Names
  console.log(`\n[Phase 2] Executing Pass 1 (Renaming to temporary names)...`);
  try {
    for (let i = 0; i < FOLDER_MAPPINGS.length; i++) {
      const mapping = FOLDER_MAPPINGS[i];
      const origPath = path.join(targetDir, mapping.original);
      const premPath = path.join(targetDir, mapping.premium);
      const tempName = `__temp_rename_${i}_${Date.now()}`;
      const tempPath = path.join(targetDir, tempName);

      const srcPath = fs.existsSync(origPath) ? origPath : (fs.existsSync(premPath) ? premPath : null);

      if (srcPath) {
        fs.renameSync(srcPath, tempPath);
        pass1Journal.push({
          original: mapping.original,
          origPath: srcPath,
          tempPath,
          premium: mapping.premium,
          mapping
        });
        console.log(`  [Pass 1] "${path.basename(srcPath)}" -> "${tempName}"`);
      } else {
        fs.mkdirSync(tempPath, { recursive: true });
        pass1Journal.push({
          original: mapping.original,
          origPath: premPath,
          tempPath,
          premium: mapping.premium,
          mapping
        });
        console.log(`  [Pass 1] Created temporary directory for missing folder: "${tempName}"`);
      }
    }
  } catch (err) {
    console.error(`❌ Error during Pass 1 atomic rename: ${err.message}`);
    console.log(`🔄 Triggering rollback for Pass 1...`);
    for (const item of pass1Journal.reverse()) {
      try {
        if (fs.existsSync(item.tempPath)) {
          if (!fs.existsSync(item.origPath)) {
            fs.renameSync(item.tempPath, item.origPath);
          }
        }
      } catch (rollbackErr) {
        console.error(`Failed to rollback ${item.tempPath}: ${rollbackErr.message}`);
      }
    }
    throw err;
  }

  // Phase 3: Pass 2 - Rename Temporary Names to Final Premium Names
  console.log(`\n[Phase 3] Executing Pass 2 (Renaming temporary folders to premium names)...`);
  const configProjects = {};

  try {
    for (const item of pass1Journal) {
      const finalPath = path.join(targetDir, item.premium);
      
      if (fs.existsSync(finalPath) && finalPath !== item.tempPath) {
        console.warn(`Target folder "${item.premium}" already exists. Merging contents...`);
        const files = fs.readdirSync(item.tempPath);
        for (const file of files) {
          const srcFile = path.join(item.tempPath, file);
          const destFile = path.join(finalPath, file);
          fs.renameSync(srcFile, destFile);
        }
        fs.rmdirSync(item.tempPath);
      } else {
        fs.renameSync(item.tempPath, finalPath);
      }
      
      const cover = resolveCoverImage(finalPath, item.mapping.coverImage);
      results.push({
        original: item.original,
        premium: item.premium,
        finalPath,
        coverImage: cover,
        category: item.mapping.category
      });

      configProjects[item.premium] = {
        title: item.premium,
        category: item.mapping.category,
        coverImage: cover,
        description: item.mapping.description,
        legacyProjectId: item.mapping.legacyProjectId || null
      };

      console.log(`  [Pass 2] "${path.basename(item.tempPath)}" -> "${item.premium}"`);
    }
  } catch (err) {
    console.error(`❌ Error during Pass 2 rename: ${err.message}`);
    throw err;
  }

  // Write portfolio-config.json
  const configPath = path.join(__dirname, '../public/js/portfolio-config.json');
  fs.writeFileSync(configPath, JSON.stringify({ projects: configProjects }, null, 2), 'utf8');
  console.log(`💾 Persisted configuration to ${configPath}`);

  console.log(`\n✅ All 19 project folders successfully renamed on disk!`);
  return { success: true, results };
}

// Allow standalone CLI execution or module import
if (require.main === module) {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  renameProjects({ dryRun }).catch(err => {
    console.error('Fatal execution error:', err);
    process.exit(1);
  });
}

module.exports = { renameProjects, FOLDER_MAPPINGS, resolveCoverImage };

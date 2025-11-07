#!/usr/bin/env node

/**
 * Migration script for Nostr Team Chat improvements
 * Helps transition from old architecture to new unified system
 */

const fs = require('fs');
const path = require('path');

const BACKUP_DIR = './migration-backup';
const DRY_RUN = process.argv.includes('--dry-run');

// Files to backup before deletion
const OLD_FILES = [
  'lib/stores/workspace-store.ts',
  'lib/stores/workspace-store-clean.ts',
  'lib/hooks/use-nip29-workspaces.ts',
  'lib/hooks/use-app-initialization.ts',
  'lib/hooks/use-channel-messages.ts'
];

// Import replacements
const IMPORT_REPLACEMENTS = [
  {
    from: "import { useNIP29Workspaces } from '@/lib/hooks/use-nip29-workspaces';",
    to: "// Removed: useNIP29Workspaces - now handled by unified store"
  },
  {
    from: "import { useWorkspaceStore } from '@/lib/stores/workspace-store';",
    to: "import { useWorkspaceStore } from '@/lib/stores/workspace-store-unified';"
  },
  {
    from: "import { useWorkspaceStore as useWorkspaceStoreClean } from '@/lib/stores/workspace-store-clean';",
    to: "import { useWorkspaceStore } from '@/lib/stores/workspace-store-unified';"
  },
  {
    from: "import { useChannelMessages } from '@/lib/hooks/use-channel-messages';",
    to: "import { useMessagesOptimized } from '@/lib/hooks/use-messages-optimized';"
  },
  {
    from: "import { useAppInitialization } from '@/lib/hooks/use-app-initialization-clean';",
    to: "// Removed: useAppInitialization - now handled by unified store"
  }
];

// Hook usage replacements
const USAGE_REPLACEMENTS = [
  {
    from: /useNIP29Workspaces\(\);?/g,
    to: "// Removed: useNIP29Workspaces() - workspaces now loaded via store"
  },
  {
    from: /const\s+{\s*messages,\s*isLoading,\s*sendMessage\s*}\s*=\s*useChannelMessages\([^)]+\);?/g,
    to: "const { messages, loading, sendMessage } = useMessagesOptimized({ channelId });"
  }
];

function log(message, type = 'info') {
  const colors = {
    info: '\x1b[36m',
    success: '\x1b[32m',
    warning: '\x1b[33m',
    error: '\x1b[31m',
    reset: '\x1b[0m'
  };

  console.log(`${colors[type]}${message}${colors.reset}`);
}

function createBackupDir() {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
    log(`Created backup directory: ${BACKUP_DIR}`, 'success');
  }
}

function backupFile(filePath) {
  if (!fs.existsSync(filePath)) {
    log(`File not found: ${filePath}`, 'warning');
    return false;
  }

  const backupPath = path.join(BACKUP_DIR, filePath);
  const backupDir = path.dirname(backupPath);

  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  fs.copyFileSync(filePath, backupPath);
  log(`Backed up: ${filePath} -> ${backupPath}`, 'success');
  return true;
}

function findFilesToUpdate() {
  const filesToUpdate = [];

  function scanDirectory(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
        scanDirectory(fullPath);
      } else if (entry.isFile() && (entry.name.endsWith('.tsx') || entry.name.endsWith('.ts'))) {
        // Check if file contains old imports
        const content = fs.readFileSync(fullPath, 'utf8');
        const hasOldImports = IMPORT_REPLACEMENTS.some(replacement =>
          content.includes(replacement.from.split("'")[1]) // Check import path
        );

        if (hasOldImports) {
          filesToUpdate.push(fullPath);
        }
      }
    }
  }

  scanDirectory('./app');
  scanDirectory('./components');
  scanDirectory('./lib');

  return filesToUpdate;
}

function updateFileContent(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let hasChanges = false;

  // Apply import replacements
  for (const replacement of IMPORT_REPLACEMENTS) {
    if (content.includes(replacement.from)) {
      content = content.replace(replacement.from, replacement.to);
      hasChanges = true;
      log(`  Replaced import in ${filePath}`, 'info');
    }
  }

  // Apply usage replacements
  for (const replacement of USAGE_REPLACEMENTS) {
    if (replacement.from.test && replacement.from.test(content)) {
      content = content.replace(replacement.from, replacement.to);
      hasChanges = true;
      log(`  Replaced usage in ${filePath}`, 'info');
    }
  }

  if (hasChanges && !DRY_RUN) {
    fs.writeFileSync(filePath, content, 'utf8');
    log(`Updated: ${filePath}`, 'success');
  } else if (hasChanges) {
    log(`Would update: ${filePath}`, 'info');
  }

  return hasChanges;
}

function removeOldFiles() {
  for (const filePath of OLD_FILES) {
    if (fs.existsSync(filePath)) {
      if (!DRY_RUN) {
        fs.unlinkSync(filePath);
        log(`Removed: ${filePath}`, 'success');
      } else {
        log(`Would remove: ${filePath}`, 'info');
      }
    }
  }
}

function checkNewFiles() {
  const requiredFiles = [
    'lib/data/workspace-data-manager.ts',
    'lib/data/subscription-manager.ts',
    'lib/data/data-manager.ts',
    'lib/stores/workspace-store-unified.ts',
    'lib/hooks/use-error-handling.ts',
    'lib/hooks/use-messages-optimized.ts',
    'lib/errors/nostr-errors.ts',
    'components/ui/LoadingBoundary.tsx',
    'components/ui/ErrorBoundary.tsx'
  ];

  const missing = requiredFiles.filter(file => !fs.existsSync(file));

  if (missing.length > 0) {
    log('Missing required files:', 'error');
    missing.forEach(file => log(`  - ${file}`, 'error'));
    return false;
  }

  log('All required files are present', 'success');
  return true;
}

function main() {
  log('🚀 Starting Nostr Team Chat Migration', 'info');

  if (DRY_RUN) {
    log('🔍 DRY RUN MODE - No files will be modified', 'warning');
  }

  // Check if new files exist
  if (!checkNewFiles()) {
    log('❌ Migration cannot proceed without required files', 'error');
    process.exit(1);
  }

  // Create backup directory
  createBackupDir();

  // Backup old files
  log('\n📦 Backing up old files...', 'info');
  let backedUpCount = 0;
  for (const filePath of OLD_FILES) {
    if (backupFile(filePath)) {
      backedUpCount++;
    }
  }
  log(`Backed up ${backedUpCount} files`, 'success');

  // Find files to update
  log('\n🔍 Scanning for files to update...', 'info');
  const filesToUpdate = findFilesToUpdate();
  log(`Found ${filesToUpdate.length} files to update`, 'info');

  // Update files
  if (filesToUpdate.length > 0) {
    log('\n✏️  Updating files...', 'info');
    let updatedCount = 0;
    for (const filePath of filesToUpdate) {
      if (updateFileContent(filePath)) {
        updatedCount++;
      }
    }
    log(`Updated ${updatedCount} files`, 'success');
  }

  // Remove old files
  log('\n🗑️  Removing old files...', 'info');
  removeOldFiles();

  log('\n✅ Migration completed!', 'success');
  log('\nNext steps:', 'info');
  log('1. Review the updated files', 'info');
  log('2. Test the application thoroughly', 'info');
  log('3. Check the migration guide for additional changes', 'info');

  if (DRY_RUN) {
    log('\nRun without --dry-run to apply changes', 'warning');
  }
}

// Run migration
if (require.main === module) {
  try {
    main();
  } catch (error) {
    log(`❌ Migration failed: ${error.message}`, 'error');
    process.exit(1);
  }
}
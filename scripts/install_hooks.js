import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const workspaceRoot = path.resolve(__dirname, '..');
const gitDir = path.join(workspaceRoot, '.git');
const hooksDir = path.join(gitDir, 'hooks');
const preCommitHookPath = path.join(hooksDir, 'pre-commit');

console.log('====================================================');
console.log('  NEKTAB Git Hook Installer (Security Integration)  ');
console.log('====================================================');

if (!fs.existsSync(gitDir)) {
  console.error('❌ Error: .git directory not found. Are you in a git repository?');
  process.exit(1);
}

if (!fs.existsSync(hooksDir)) {
  fs.mkdirSync(hooksDir, { recursive: true });
}

// Shell script for the pre-commit hook
const hookContent = `#!/bin/sh
# NEKTAB Secure Development pre-commit hook
# Runs static analysis (SAST) and linting checks before committing.

echo "=============================================="
echo "🔒 Running pre-commit security checks..."
echo "=============================================="

# Run SAST Scanner
npm run sast
if [ $? -ne 0 ]; then
  echo "❌ Pre-commit Hook: SAST scanner failed. Commit aborted."
  exit 1
fi

# Run Linter
npm run lint
if [ $? -ne 0 ]; then
  echo "❌ Pre-commit Hook: Linter failed. Commit aborted."
  exit 1
fi

echo "✅ Pre-commit security checks passed. Committing changes..."
exit 0
`;

try {
  fs.writeFileSync(preCommitHookPath, hookContent.replace(/\r\n/g, '\n'), {
    mode: 0o755 // Make executable on POSIX systems
  });
  
  console.log(`✅ Pre-commit hook written successfully to:`);
  console.log(`  ${preCommitHookPath}`);
  console.log('\nYour git environment is now protected against committing vulnerabilities.');
  process.exit(0);
} catch (error) {
  console.error(`❌ Failed to install pre-commit hook: ${error.message}`);
  process.exit(1);
}

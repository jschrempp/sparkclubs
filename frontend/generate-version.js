const fs = require('fs');
const { execSync } = require('child_process');

const versionPath = 'src/version.json';

try {
  // Get git commit hash
  const gitHash = execSync('git rev-parse --short HEAD').toString().trim();
  const gitBranch = execSync('git rev-parse --abbrev-ref HEAD').toString().trim();
  const buildDate = new Date().toISOString();
  
  const versionInfo = {
    version: gitHash,
    branch: gitBranch,
    buildDate: buildDate
  };
  
  // Write to src directory so it's included in the build
  fs.writeFileSync(versionPath, JSON.stringify(versionInfo, null, 2));
  
  console.log('\n========================================');
  console.log(`✓ VERSION GENERATED: ${gitHash} (${gitBranch})`);
  console.log('========================================\n');
} catch (error) {
  console.log('\n========================================');
  console.log('⚠ Git not available:', error.message);
  
  // Check if version.json already exists (from git commit)
  if (fs.existsSync(versionPath)) {
    const existingVersion = JSON.parse(fs.readFileSync(versionPath, 'utf8'));
    console.log(`✓ USING COMMITTED VERSION: ${existingVersion.version} (${existingVersion.branch})`);
    console.log('========================================\n');
  } else {
    // Create a fallback version file only if none exists
    const fallbackVersion = {
      version: 'dev',
      branch: 'unknown',
      buildDate: new Date().toISOString()
    };
    fs.writeFileSync(versionPath, JSON.stringify(fallbackVersion, null, 2));
    console.log('✗ USING FALLBACK VERSION: dev (unknown)');
    console.log('========================================\n');
  }
}

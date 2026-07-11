const fs = require('fs');
const { execSync } = require('child_process');

const versionPath = 'src/version.json';

// Prefer Railway's build-time env vars, since the build sandbox does not
// always have a working .git directory available for `git rev-parse`.
// See: https://docs.railway.app/reference/variables#railway-provided-variables
const railwaySha = process.env.RAILWAY_GIT_COMMIT_SHA;
const railwayBranch = process.env.RAILWAY_GIT_BRANCH;

try {
  let gitHash;
  let gitBranch;

  if (railwaySha) {
    gitHash = railwaySha.substring(0, 7);
    gitBranch = railwayBranch || 'main';
    console.log('\n========================================');
    console.log(`✓ VERSION FROM RAILWAY ENV: ${gitHash} (${gitBranch})`);
    console.log('========================================\n');
  } else {
    // Local/dev build: fall back to reading git directly
    gitHash = execSync('git rev-parse --short HEAD').toString().trim();
    gitBranch = execSync('git rev-parse --abbrev-ref HEAD').toString().trim();
    console.log('\n========================================');
    console.log(`✓ VERSION GENERATED: ${gitHash} (${gitBranch})`);
    console.log('========================================\n');
  }

  const buildDate = new Date().toISOString();
  const versionInfo = {
    version: gitHash,
    branch: gitBranch,
    buildDate: buildDate
  };

  // Write to src directory so it's included in the build
  fs.writeFileSync(versionPath, JSON.stringify(versionInfo, null, 2));
} catch (error) {
  console.log('\n========================================');
  console.log('⚠ Unable to determine version:', error.message);

  // Do NOT fall back to any previously committed version.json here -
  // that file is a build artifact and can go stale, silently masking
  // real deployments. Always write an explicit "unknown" marker instead
  // so a broken version pipeline is obvious rather than misleading.
  const fallbackVersion = {
    version: 'unknown',
    branch: 'unknown',
    buildDate: new Date().toISOString()
  };
  fs.writeFileSync(versionPath, JSON.stringify(fallbackVersion, null, 2));
  console.log('✗ USING FALLBACK VERSION: unknown');
  console.log('========================================\n');
}

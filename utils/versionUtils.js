const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * Increments the version in package.json
 * @param {string} type - The type of version increment ('patch', 'minor', or 'major')
 * @returns {string} The new version
 */
function incrementVersion(type = 'patch') {
  // Validate type
  if (!['patch', 'minor', 'major'].includes(type)) {
    throw new Error(`Invalid version increment type: ${type}. Must be 'patch', 'minor', or 'major'.`);
  }
  
  // Read the package.json file
  const packageJsonPath = path.join(__dirname, '..', 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  
  // Get the current version
  const currentVersion = packageJson.version;
  console.log(`Current version: ${currentVersion}`);
  
  // Parse the version
  const [major, minor, patch] = currentVersion.split('.').map(Number);
  
  // Calculate the new version
  let newVersion;
  if (type === 'major') {
    newVersion = `${major + 1}.0.0`;
  } else if (type === 'minor') {
    newVersion = `${major}.${minor + 1}.0`;
  } else {
    newVersion = `${major}.${minor}.${patch + 1}`;
  }
  
  // Update the package.json with the new version
  packageJson.version = newVersion;
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
  
  console.log(`Version incremented from ${currentVersion} to ${newVersion}`);
  
  // Return the new version
  return newVersion;
}

/**
 * Automatically increments the patch version
 * @returns {string} The new version
 */
function autoIncrementPatchVersion() {
  return incrementVersion('patch');
}

/**
 * Creates a git tag for the current version
 * @param {string} version - The version to tag
 */
function createVersionTag(version) {
  try {
    // Create a git tag
    execSync(`git tag -a v${version} -m "Version ${version}"`);
    console.log(`Created git tag v${version}`);
  } catch (error) {
    console.error('Failed to create git tag:', error.message);
  }
}

// If the script is run directly
if (require.main === module) {
  // Get the version type from command line arguments
  const args = process.argv.slice(2);
  const type = args[0] || 'patch';
  
  try {
    const newVersion = incrementVersion(type);
    console.log(`Successfully updated to version ${newVersion}`);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

module.exports = {
  incrementVersion,
  autoIncrementPatchVersion,
  createVersionTag
}; 
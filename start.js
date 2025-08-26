const { execSync } = require('child_process');

try {
  execSync('npm run build', { stdio: 'inherit' });
} catch (error) {
  process.exit(1);
}

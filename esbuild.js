const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

const isProduction = process.argv.includes('--production');
const isWatch = process.argv.includes('--watch');

// Ensure dist and dist/media exist
if (!fs.existsSync('dist')) {
  fs.mkdirSync('dist', { recursive: true });
}
if (!fs.existsSync('dist/media')) {
  fs.mkdirSync('dist/media', { recursive: true });
}

// Copy media assets (HTML, CSS, JS, SVG, etc.)
function copyMedia() {
  const mediaSrc = path.join(__dirname, 'src', 'webview', 'media');
  const mediaDest = path.join(__dirname, 'dist', 'media');
  if (fs.existsSync(mediaSrc)) {
    const files = fs.readdirSync(mediaSrc);
    for (const file of files) {
      fs.copyFileSync(path.join(mediaSrc, file), path.join(mediaDest, file));
    }
  }
}

copyMedia();

/** @type {import('esbuild').BuildOptions} */
const extensionOptions = {
  entryPoints: ['src/extension.ts'],
  bundle: true,
  outfile: 'dist/extension.js',
  external: ['vscode'],
  format: 'cjs',
  platform: 'node',
  target: 'node18',
  sourcemap: !isProduction,
  minify: isProduction,
  logLevel: 'info',
};

async function main() {
  if (isWatch) {
    const ctx = await esbuild.context(extensionOptions);
    await ctx.watch();
    console.log('[esbuild] Watching for changes...');
  } else {
    await esbuild.build(extensionOptions);
    console.log('[esbuild] Build finished successfully.');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

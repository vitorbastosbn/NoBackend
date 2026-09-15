// Compile MockServer standalone for node test environment
const esbuild = require('esbuild');
const path = require('path');
const fs = require('fs');

const outFile = path.join(__dirname, 'mockserver-bundle.js');
esbuild.buildSync({
  entryPoints: [path.join(__dirname, '..', 'src', 'server', 'MockServer.ts')],
  bundle: true,
  platform: 'node',
  target: 'node18',
  format: 'cjs',
  outfile: outFile,
  external: ['vscode']
});

const { MockServer } = require('./mockserver-bundle');
module.exports = { MockServer };

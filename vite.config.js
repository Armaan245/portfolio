import { defineConfig } from 'vite';
import fs from 'node:fs';
import path from 'node:path';

function copyDir(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

export default defineConfig({
  plugins: [
    {
      name: 'copy-static-dirs',
      closeBundle() {
        copyDir('assets', 'dist/assets');
        copyDir('js', 'dist/js');
        copyDir('css', 'dist/css');
      },
    },
  ],
  server: {
    port: 5173,
    open: true,
  },
});

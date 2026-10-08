import { createHash } from 'node:crypto';
import { createReadStream, createWriteStream } from 'node:fs';
import { mkdir, mkdtemp, readFile, readdir, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import archiver from 'archiver';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const extensionDir = join(root, 'packages', 'extension');
const distDir = join(extensionDir, 'dist');
const checkOnly = process.argv.includes('--check-only');
const outputDir = checkOnly ? await mkdtemp(join(tmpdir(), 'ctp-extension-')) : join(root, 'releases');
const outputPath = join(outputDir, `clipboard-text-processor-extension-${dateStamp()}.zip`);

try {
  await validateDist();
  await mkdir(outputDir, { recursive: true });
  await createZip(outputPath);
  const info = await stat(outputPath);
  const sha256 = await hashFile(outputPath);
  console.log(`Extension ZIP: ${outputPath}`);
  console.log(`Size: ${info.size} bytes`);
  console.log(`SHA-256: ${sha256}`);
} finally {
  if (checkOnly) {
    await rm(outputDir, { recursive: true, force: true });
  }
}

async function validateDist() {
  const manifestPath = join(distDir, 'manifest.json');
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  if (manifest.manifest_version !== 3) {
    throw new Error('Extension dist must contain a Manifest V3 manifest.json at its root.');
  }
  const files = await listFiles(distDir);
  const forbidden = files.find(path =>
    /(^|\/)(dist\.(pem|crx)|package\.json|tsconfig[^/]*\.json)$/i.test(path) ||
    /\.(ts|tsx|vue|map|pem|crx)$/i.test(path) ||
    /\.(test|spec)\.[^/]+$/i.test(path)
  );
  if (forbidden) {
    throw new Error(`Forbidden file found in extension dist: ${forbidden}`);
  }
}

async function listFiles(directory, prefix = '') {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      files.push(...await listFiles(join(directory, entry.name), relativePath));
    } else {
      files.push(relativePath);
    }
  }
  return files;
}

function createZip(destination) {
  return new Promise((resolvePromise, reject) => {
    const output = createWriteStream(destination);
    const archive = archiver('zip', { zlib: { level: 9 } });
    output.on('close', resolvePromise);
    output.on('error', reject);
    archive.on('error', reject);
    archive.pipe(output);
    archive.directory(distDir, false);
    void archive.finalize();
  });
}

async function hashFile(path) {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(path)) {
    hash.update(chunk);
  }
  return hash.digest('hex').toUpperCase();
}

function dateStamp() {
  const now = new Date();
  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0')
  ].join('');
}

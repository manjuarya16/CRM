import path from 'path';
import fs from 'fs';

/**
 * Returns candidate root directories where uploaded files might be stored on disk.
 * Supports current structure (uploads/), legacy src structure (src/uploads/),
 * public uploads (public/uploads/), as well as project-root vs server-root cwd execution.
 */
export function getCandidateUploadRoots(): string[] {
  const roots = [
    // 1. Relative to this file's location (server/uploads)
    path.resolve(__dirname, '..', '..', 'uploads'),
    path.resolve(__dirname, '..', 'uploads'),
    // 2. Working directory uploads
    path.resolve(process.cwd(), 'uploads'),
    path.resolve(process.cwd(), 'server', 'uploads'),
    // 3. Legacy src/uploads
    path.resolve(__dirname, '..', '..', 'src', 'uploads'),
    path.resolve(process.cwd(), 'src', 'uploads'),
    path.resolve(process.cwd(), 'server', 'src', 'uploads'),
    // 4. Legacy public/uploads
    path.resolve(__dirname, '..', '..', 'public', 'uploads'),
    path.resolve(process.cwd(), 'public', 'uploads'),
    path.resolve(process.cwd(), 'server', 'public', 'uploads'),
    // 5. Direct relative
    path.resolve(__dirname, 'uploads'),
  ];

  // Return deduplicated roots
  return Array.from(new Set(roots));
}

/**
 * Gets the primary canonical directory where new uploads should be written.
 * Resolves to server/uploads or cwd/uploads, ensuring the directory exists.
 */
export function getCanonicalUploadDir(subfolder?: string): string {
  let baseDir = path.resolve(__dirname, '..', '..', 'uploads');
  if (!fs.existsSync(baseDir)) {
    if (path.basename(process.cwd()) === 'server') {
      baseDir = path.resolve(process.cwd(), 'uploads');
    } else if (fs.existsSync(path.resolve(process.cwd(), 'server', 'uploads'))) {
      baseDir = path.resolve(process.cwd(), 'server', 'uploads');
    } else {
      baseDir = path.resolve(process.cwd(), 'uploads');
    }
  }

  const target = subfolder ? path.join(baseDir, subfolder) : baseDir;
  if (!fs.existsSync(target)) {
    fs.mkdirSync(target, { recursive: true });
  }
  return target;
}

/**
 * Sanitizes and strips URL/path prefixes (/uploads, /src/uploads, /public/uploads, etc.)
 * returning the relative sub-path (e.g. 'mail/xyz.png' or 'config/logo.png').
 */
export function cleanUploadSubPath(rawUrlOrPath: string): string {
  if (!rawUrlOrPath) return '';
  // 1. Strip query strings and hash
  let cleaned = rawUrlOrPath.split('?')[0].split('#')[0];
  // 2. Normalize Windows backslashes to forward slashes for matching
  cleaned = cleaned.replace(/\\/g, '/');
  // 3. Strip any domain/protocol
  cleaned = cleaned.replace(/^https?:\/\/[^\/]+/i, '');
  // 4. Strip leading slashes
  cleaned = cleaned.replace(/^\/+/, '');
  // 5. Strip any prefix like 'src/uploads/', 'public/uploads/', 'server/uploads/', 'uploads/'
  cleaned = cleaned.replace(/^(?:server\/)?(?:src\/|public\/)?uploads\/?/i, '');
  // 6. Security: prevent directory traversal
  cleaned = path.normalize(cleaned).replace(/^(\.\.[\/\\])+/, '').replace(/\\/g, '/');
  return cleaned;
}

/**
 * Looks up a file across all candidate upload roots.
 * If found and is a valid file, returns its absolute path. Otherwise returns null.
 */
export function findLocalUploadFile(rawUrlOrPath: string): string | null {
  const subPath = cleanUploadSubPath(rawUrlOrPath);
  if (!subPath) return null;

  const roots = getCandidateUploadRoots();
  for (const root of roots) {
    if (!fs.existsSync(root)) continue;
    const fullCandidate = path.resolve(root, subPath);
    // Path traversal check: must stay inside root
    if (fullCandidate.startsWith(root) && fs.existsSync(fullCandidate)) {
      try {
        const stat = fs.statSync(fullCandidate);
        if (stat.isFile()) {
          return fullCandidate;
        }
      } catch {
        // Continue searching other candidate directories
      }
    }
  }
  return null;
}

import fsp from "fs/promises";
import path from "path";
import childProcess from "child_process";

// Logger utility
const logger = {
  info: (msg: string) => console.log(`\x1b[32m[INFO]\x1b[0m ${msg}`),
  warn: (msg: string) => console.warn(`\x1b[33m[WARN]\x1b[0m ${msg}`),
  err: (err: any) => console.error(`\x1b[31m[ERR]\x1b[0m`, err),
};

/**
 * Start build process
 */
(async () => {
  try {
    // 1. Remove previous build
    logger.info("Cleaning previous build directory (dist/)...");
    await remove("./dist/");

    // 2. Run lint
    logger.info("Running linter...");
    await exec("npm run lint", "./");

    // 3. Compile TypeScript and resolve aliases
    logger.info("Compiling TypeScript and resolving path aliases...");
    await exec("tsc -p tsconfig.json && npx tsc-alias -p tsconfig.json", "./");

    // 4. Copy static assets if they exist
    if (await pathExists("./src/public")) {
      await copy("./src/public", "./dist/public");
    }
    if (await pathExists("./src/views")) {
      await copy("./src/views", "./dist/views");
    }
    if (await pathExists("./temp/")) {
      await remove("./temp/");
    }

    logger.info("---------------------------------------------");
    logger.info("Build completed successfully! Built files list:");
    await printBuildFiles("./dist/");
    logger.info("---------------------------------------------");
  } catch (err) {
    logger.err(err);
    process.exit(1);
  }
})();

/**
 * Recursively list and print all built files
 */
async function printBuildFiles(
  dir: string,
  baseDir: string = dir
): Promise<void> {
  if (!(await pathExists(dir))) return;
  const files = await fsp.readdir(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = await fsp.stat(fullPath);
    if (stat.isDirectory()) {
      await printBuildFiles(fullPath, baseDir);
    } else {
      const relPath = path.relative(baseDir, fullPath);
      logger.info(`  Built: dist/${relPath.replace(/\\/g, "/")}`);
    }
  }
}

/**
 * Check if path exists
 */
async function pathExists(loc: string): Promise<boolean> {
  try {
    await fsp.access(loc);
    return true;
  } catch {
    return false;
  }
}

/**
 * Remove directory or file
 */
async function remove(loc: string): Promise<void> {
  if (await pathExists(loc)) {
    await fsp.rm(loc, { recursive: true, force: true });
  }
}

/**
 * Copy directory or file
 */
async function copy(src: string, dest: string): Promise<void> {
  await fsp.cp(src, dest, { recursive: true });
}

/**
 * Execute command line command
 */
function exec(cmd: string, loc: string): Promise<void> {
  return new Promise((res, rej) => {
    return childProcess.exec(cmd, { cwd: loc }, (err, stdout, stderr) => {
      if (stdout) {
        process.stdout.write(stdout);
      }
      if (stderr) {
        process.stderr.write(stderr);
      }
      return err ? rej(err) : res();
    });
  });
}

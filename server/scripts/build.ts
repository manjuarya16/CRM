/// <reference types="node" />
import fs from "fs";
import childProcess from "child_process";
import path from "path";

/**
 * Logger compatibility matching jet-logger
 */
const logger = {
  info: (msg: any) => console.log(msg),
  warn: (msg: any) => console.warn(msg),
  err: (msg: any) => console.error(msg),
};

/**
 * Start
 */
(async () => {
  try {
    // Remove current build
    await remove("./dist/");
    // Also remove legacy src/dist if it exists from previous deployments
    if (await pathExists("./src/dist")) {
      await remove("./src/dist");
      logger.info("Cleaned legacy ./src/dist directory.");
    }
    await exec("npx tsc -p tsconfig.json", "./");
    await exec("npx tsc-alias -p tsconfig.json", "./");

    // Copy public / assets if exist
    if (await pathExists("./src/public")) {
      await copy("./src/public", "./dist/public");
    }
    if (await pathExists("./public")) {
      await copy("./public", "./dist/public");
    }
    if (await pathExists("./src/views")) {
      await copy("./src/views", "./dist/views");
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
 * Check if path exists
 */
async function pathExists(loc: string): Promise<boolean> {
  try {
    await fs.promises.access(loc);
    return true;
  } catch {
    return false;
  }
}

/**
 * Recursively list and print all built files
 */
async function printBuildFiles(
  dir: string,
  baseDir: string = dir,
): Promise<void> {
  if (!(await pathExists(dir))) return;
  const files = await fs.promises.readdir(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = await fs.promises.stat(fullPath);
    if (stat.isDirectory()) {
      await printBuildFiles(fullPath, baseDir);
    } else {
      const relPath = path.relative(baseDir, fullPath);
      logger.info(`  Built: dist/${relPath.replace(/\\/g, "/")}`);
    }
  }
}

/**
 * Remove file
 */
function remove(loc: string): Promise<void> {
  return new Promise((res, rej) => {
    fs.rm(loc, { recursive: true, force: true }, (err) => {
      return !!err ? rej(err) : res();
    });
  });
}

/**
 * Copy file.
 */
function copy(src: string, dest: string): Promise<void> {
  return new Promise((res, rej) => {
    fs.cp(src, dest, { recursive: true }, (err) => {
      return !!err ? rej(err) : res();
    });
  });
}

/**
 * Do command line command.
 */
function exec(cmd: string, loc: string): Promise<void> {
  return new Promise((res, rej) => {
    return childProcess.exec(cmd, { cwd: loc }, (err, stdout, stderr) => {
      if (!!stdout) {
        logger.info(stdout);
      }
      if (!!stderr) {
        logger.warn(stderr);
      }
      return !!err ? rej(err) : res();
    });
  });
}

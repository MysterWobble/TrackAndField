// Saving your career to a file for the terminal version (save/career.json).
// The career rules themselves live in src/careerCore.js; this file re-exports them,
// so anything that imports from here gets both.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export * from "./careerCore.js";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const DEFAULT_SAVE = path.join(projectRoot, "save", "career.json");

export function loadCareer(file = DEFAULT_SAVE) {
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

export function saveCareer(career, file = DEFAULT_SAVE) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  // Write to a temporary file first, then swap it in, so a crash mid-save can't wreck your career.
  const temp = `${file}.tmp`;
  fs.writeFileSync(temp, JSON.stringify(career, null, 2));
  fs.renameSync(temp, file);
}

// Starting a new career keeps the old one as a backup file instead of deleting it.
export function backupCareer(file = DEFAULT_SAVE) {
  if (!fs.existsSync(file)) return null;
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backup = file.replace(/\.json$/, `-backup-${stamp}.json`);
  fs.renameSync(file, backup);
  return backup;
}

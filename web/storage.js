// Saving your career in the browser (the browser's "local storage", like a website remembering you).
// It's separate from the terminal version's save file.
//
// Some browsers block storage (private windows, strict settings). Then the game still works,
// it just can't remember your career after you close the page.

const KEY = "trackandfield.career.v1";
const BACKUP_KEY = "trackandfield.career.backup";

export function loadCareer() {
  try {
    const saved = localStorage.getItem(KEY);
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
}

// Returns false if the browser wouldn't let us save.
export function saveCareer(career) {
  try {
    localStorage.setItem(KEY, JSON.stringify(career));
    return true;
  } catch {
    return false;
  }
}

// Starting a new career keeps the old one as a backup instead of deleting it.
export function backupCareer() {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved) localStorage.setItem(BACKUP_KEY, saved);
    localStorage.removeItem(KEY);
  } catch {
    // Nothing to back up if storage is blocked.
  }
}

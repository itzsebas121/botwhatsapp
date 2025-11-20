import fs from "fs/promises";
import path from "path";
import url from "url";

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, "..", "data");
const filePath = path.join(dataDir, "ia_blocked.json");

let set = new Set();
let saving = false;

async function ensureFile() {
  try {
    await fs.mkdir(dataDir, { recursive: true });
    try {
      await fs.access(filePath);
    } catch (e) {
      // create an empty array file
      await fs.writeFile(filePath, JSON.stringify([], null, 2), "utf8");
    }
  } catch (err) {
    console.error("blocked-store: error ensuring data file:", err);
  }
}

async function load() {
  try {
    await ensureFile();
    const raw = await fs.readFile(filePath, "utf8");
    const arr = JSON.parse(raw || "[]");
    set = new Set(Array.isArray(arr) ? arr : []);
  } catch (err) {
    console.error("blocked-store: error loading file:", err);
    set = new Set();
  }
}

async function save() {
  if (saving) return; // avoid concurrent writes
  saving = true;
  try {
    const arr = [...set];
    await fs.writeFile(filePath, JSON.stringify(arr, null, 2), "utf8");
  } catch (err) {
    console.error("blocked-store: error saving file:", err);
  } finally {
    saving = false;
  }
}

// initialize load immediately but don't block importers
load().catch((e) => console.error("blocked-store init error:", e));

const iaBlocked = {
  has(value) {
    return set.has(value);
  },
  add(value) {
    const normalized = String(value || "");
    set.add(normalized);
    // fire-and-forget save
    save().catch((e) => console.error("blocked-store save error:", e));
    return iaBlocked;
  },
  delete(value) {
    const normalized = String(value || "");
    const res = set.delete(normalized);
    save().catch((e) => console.error("blocked-store save error:", e));
    return res;
  },
  values() {
    return set.values();
  },
  toArray() {
    return [...set];
  },
  get size() {
    return set.size;
  }
};

export default iaBlocked;

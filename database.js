import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.join(__dirname, "data");
const dataFile = path.join(dataDir, "database.json");

let cache = null;
let writeQueue = Promise.resolve();

function getPathValue(source, key) {
  return key.split(".").reduce((current, segment) => current?.[segment], source);
}

function setPathValue(source, key, value) {
  const segments = key.split(".");
  let current = source;

  for (let index = 0; index < segments.length - 1; index += 1) {
    const segment = segments[index];
    if (!current[segment] || typeof current[segment] !== "object") {
      current[segment] = {};
    }
    current = current[segment];
  }

  current[segments[segments.length - 1]] = value;
}

function deletePathValue(source, key) {
  const segments = key.split(".");
  const stack = [];
  let current = source;

  for (const segment of segments.slice(0, -1)) {
    if (!current || typeof current !== "object") {
      return;
    }

    stack.push([current, segment]);
    current = current[segment];
  }

  if (!current || typeof current !== "object") {
    return;
  }

  delete current[segments[segments.length - 1]];

  for (let index = stack.length - 1; index >= 0; index -= 1) {
    const [parent, segment] = stack[index];
    if (parent[segment] && typeof parent[segment] === "object" && Object.keys(parent[segment]).length === 0) {
      delete parent[segment];
    } else {
      break;
    }
  }
}

async function loadDatabase() {
  if (cache) {
    return cache;
  }

  try {
    const rawData = await fs.readFile(dataFile, "utf8");
    cache = rawData ? JSON.parse(rawData) : {};
  } catch (error) {
    if (error.code === "ENOENT") {
      cache = {};
    } else {
      throw error;
    }
  }

  return cache;
}

async function persistDatabase() {
  await fs.mkdir(dataDir, { recursive: true });

  const tempFile = `${dataFile}.tmp`;
  await fs.writeFile(tempFile, JSON.stringify(cache, null, 2), "utf8");
  await fs.rename(tempFile, dataFile);
}

async function queueWrite(task) {
  writeQueue = writeQueue.then(task, task);
  return writeQueue;
}

const db = {
  async get(key) {
    const state = await loadDatabase();
    return getPathValue(state, key);
  },

  async set(key, value) {
    return queueWrite(async () => {
      const state = await loadDatabase();
      setPathValue(state, key, value);
      await persistDatabase();
      return value;
    });
  },

  async delete(key) {
    return queueWrite(async () => {
      const state = await loadDatabase();
      deletePathValue(state, key);
      await persistDatabase();
    });
  },

  async all() {
    const state = await loadDatabase();
    return Object.entries(state).map(([id, value]) => ({ id, value }));
  },
};

export async function setNewsChannel(guildId, channelId) {
  return db.set(`guild_${guildId}.newsChannel`, channelId);
}

export async function getNewsChannel(guildId) {
  return db.get(`guild_${guildId}.newsChannel`);
}

export async function setNewsRole(guildId, roleId) {
  return db.set(`guild_${guildId}.newsRole`, roleId);
}

export async function getNewsRole(guildId) {
  return db.get(`guild_${guildId}.newsRole`);
}

export async function getAllGuildConfigs() {
  const all = await db.all();
  return all.filter((item) => item.id.startsWith("guild_"));
}

export default db;

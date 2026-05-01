import mongoose from "mongoose";

const guildSchema = new mongoose.Schema({
  guildId: { type: String, required: true, unique: true },
  newsChannel: { type: String, default: null },
  newsRole: { type: String, default: null },
});

const configSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  value: mongoose.Schema.Types.Mixed,
});

const Guild = mongoose.model("Guild", guildSchema);
const Config = mongoose.model("Config", configSchema);

export async function connectDatabase() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Conectado ao MongoDB");
}

function parseKey(key) {
  if (key.startsWith("guild_")) {
    const parts = key.split(".");
    const guildId = parts[0].replace("guild_", "");
    const field = parts[1] ?? null;
    return { type: "guild", guildId, field };
  }
  return { type: "config", key };
}

const db = {
  async get(key) {
    const parsed = parseKey(key);
    if (parsed.type === "guild") {
      const guild = await Guild.findOne({ guildId: parsed.guildId });
      if (!guild) return undefined;
      if (parsed.field) return guild[parsed.field] ?? undefined;
      return { newsChannel: guild.newsChannel, newsRole: guild.newsRole };
    }
    const config = await Config.findOne({ key: parsed.key });
    return config?.value ?? undefined;
  },

  async set(key, value) {
    const parsed = parseKey(key);
    if (parsed.type === "guild") {
      if (parsed.field) {
        await Guild.findOneAndUpdate(
          { guildId: parsed.guildId },
          { [parsed.field]: value },
          { upsert: true, new: true }
        );
      }
    } else {
      await Config.findOneAndUpdate(
        { key: parsed.key },
        { value },
        { upsert: true }
      );
    }
    return value;
  },

  async delete(key) {
    const parsed = parseKey(key);
    if (parsed.type === "guild" && parsed.field) {
      await Guild.findOneAndUpdate(
        { guildId: parsed.guildId },
        { [parsed.field]: null }
      );
    } else if (parsed.type === "config") {
      await Config.deleteOne({ key: parsed.key });
    }
  },

  async all() {
    const guilds = await Guild.find({});
    return guilds.map((g) => ({
      id: `guild_${g.guildId}`,
      value: { newsChannel: g.newsChannel, newsRole: g.newsRole },
    }));
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
  return db.all();
}

export default db;

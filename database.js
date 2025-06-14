import { QuickDB } from "quick.db";

const db = new QuickDB();

export async function setNewsChannel(guildId, channelId) {
  return await db.set(`guild_${guildId}.newsChannel`, channelId);
}

export async function getNewsChannel(guildId) {
  return await db.get(`guild_${guildId}.newsChannel`);
}

export async function setNewsRole(guildId, roleId) {
  return await db.set(`guild_${guildId}.newsRole`, roleId);
}

export async function getNewsRole(guildId) {
  return await db.get(`guild_${guildId}.newsRole`);
}

export async function getAllGuildConfigs() {
  const all = await db.all();
  return all.filter((item) => item.id.startsWith("guild_"));
}

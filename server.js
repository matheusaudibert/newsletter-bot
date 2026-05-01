import { createServer } from "http";
import { ChannelType } from "discord.js";

const CACHE_TTL = 3 * 60 * 60 * 1000; // 3 horas

let guildsCache = null;
let cacheExpiry = 0;

async function buildGuildsList(client) {
  const results = await Promise.all(
    client.guilds.cache.map(async (guild) => {
      let inviteUrl = null;
      try {
        const textChannel = guild.channels.cache.find(
          (c) => c.type === ChannelType.GuildText && c.permissionsFor(guild.members.me)?.has("CreateInstantInvite")
        );
        if (textChannel) {
          const invite = await textChannel.createInvite({ maxAge: 0, maxUses: 0, unique: false });
          inviteUrl = invite.url;
        }
      } catch {
        // sem permissão para criar convite
      }

      return {
        id: guild.id,
        name: guild.name,
        memberCount: guild.memberCount,
        iconUrl: guild.iconURL({ size: 1024, extension: "png" }),
        inviteUrl,
      };
    })
  );

  return results.sort((a, b) => b.memberCount - a.memberCount);
}

export function startServer(client) {
  const server = createServer(async (req, res) => {
    if (req.url === "/guilds" && req.method === "GET") {
      try {
        const now = Date.now();

        if (guildsCache && now < cacheExpiry) {
          res.writeHead(200, {
            "Content-Type": "application/json",
            "X-Cache": "HIT",
            "Cache-Control": `max-age=${Math.floor((cacheExpiry - now) / 1000)}`,
          });
          return res.end(JSON.stringify(guildsCache));
        }

        const guilds = await buildGuildsList(client);
        guildsCache = guilds;
        cacheExpiry = now + CACHE_TTL;

        res.writeHead(200, {
          "Content-Type": "application/json",
          "X-Cache": "MISS",
          "Cache-Control": `max-age=${CACHE_TTL / 1000}`,
        });
        res.end(JSON.stringify(guilds));
      } catch (err) {
        console.error("Erro na rota /guilds:", err);
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Erro interno do servidor" }));
      }
    } else {
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Rota não encontrada" }));
    }
  });

  const port = process.env.PORT || 3000;
  server.listen(port, () => {
    console.log(`Servidor HTTP rodando na porta ${port}`);
  });
}

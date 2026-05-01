import { createServer } from "http";
import { ChannelType } from "discord.js";
import db from "./database.js";
import { getNewsBySlug } from "./utils/api.js";

const GUILDS_CACHE_TTL = 3 * 60 * 60 * 1000; // 3 horas
const NEWS_CACHE_TTL = 2 * 60 * 1000; // 2 minutos

let guildsCache = null;
let guildsCacheExpiry = 0;

let newsCache = null;
let newsCacheExpiry = 0;

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

        if (guildsCache && now < guildsCacheExpiry) {
          res.writeHead(200, {
            "Content-Type": "application/json",
            "X-Cache": "HIT",
            "Cache-Control": `max-age=${Math.floor((guildsCacheExpiry - now) / 1000)}`,
          });
          return res.end(JSON.stringify(guildsCache));
        }

        const guilds = await buildGuildsList(client);
        guildsCache = guilds;
        guildsCacheExpiry = now + GUILDS_CACHE_TTL;

        res.writeHead(200, {
          "Content-Type": "application/json",
          "X-Cache": "MISS",
          "Cache-Control": `max-age=${GUILDS_CACHE_TTL / 1000}`,
        });
        res.end(JSON.stringify(guilds));
      } catch (err) {
        console.error("Erro na rota /guilds:", err);
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Erro interno do servidor" }));
      }
    } else if (req.url === "/new" && req.method === "GET") {
      try {
        const now = Date.now();

        if (newsCache && now < newsCacheExpiry) {
          res.writeHead(200, {
            "Content-Type": "application/json",
            "X-Cache": "HIT",
            "Cache-Control": `max-age=${Math.floor((newsCacheExpiry - now) / 1000)}`,
          });
          return res.end(JSON.stringify(newsCache));
        }

        const slug = await db.get("lastSentNewsSlug");

        if (!slug) {
          res.writeHead(404, { "Content-Type": "application/json" });
          return res.end(JSON.stringify({ error: "Nenhuma notícia enviada ainda" }));
        }

        const news = await getNewsBySlug(slug);

        if (!news) {
          res.writeHead(502, { "Content-Type": "application/json" });
          return res.end(JSON.stringify({ error: "Falha ao buscar notícia na API" }));
        }

        const payload = {
          slug: news.slug,
          title: news.title,
          body: news.body,
          tabNewsUrl: `https://www.tabnews.com.br/NewsletterOficial/${news.slug}`,
          sourceUrl: news.source_url,
        };

        newsCache = payload;
        newsCacheExpiry = now + NEWS_CACHE_TTL;

        res.writeHead(200, {
          "Content-Type": "application/json",
          "X-Cache": "MISS",
          "Cache-Control": `max-age=${NEWS_CACHE_TTL / 1000}`,
        });
        res.end(JSON.stringify(payload));
      } catch (err) {
        console.error("Erro na rota /new:", err);
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

import {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  ActivityType,
  ChannelType,
} from "discord.js";
import { config } from "dotenv";
import { QuickDB } from "quick.db";
import { createNewsEmbed } from "./utils/embeds.js";
import { getLatestNews } from "./utils/api.js";
import { CanalCommand } from "./commands/canal.js";
import { CargoCommand } from "./commands/cargo.js";
import { MenuCommand } from "./commands/menu.js";

config();

const db = new QuickDB();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

process.on("unhandledRejection", console.error);
process.on("uncaughtException", console.error);

const commands = [
  CanalCommand.data.toJSON(),
  CargoCommand.data.toJSON(),
  MenuCommand.data.toJSON(),
];
const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

client.once("ready", async () => {
  console.log(`Bot iniciado como ${client.user.tag}`);

  client.user.setActivity("📰 Últimas notícias", {
    type: ActivityType.Watching,
  });

  try {
    await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), {
      body: commands,
    });
    console.log("Comandos registrados com sucesso!");
  } catch (error) {
    console.error("Erro ao registrar comandos:", error);
  }

  startNewsCheck();
});

client.on("interactionCreate", async (interaction) => {
  try {
    if (!interaction.isRepliable()) return;

    if (interaction.isCommand()) {
      switch (interaction.commandName) {
        case "canal":
          await CanalCommand.execute(interaction, db);
          break;
        case "cargo":
          await CargoCommand.execute(interaction, db);
          break;
        case "menu":
          await MenuCommand.execute(interaction, db);
          break;
      }
    } else if (interaction.isButton()) {
      if (interaction.customId === "inviteButton") {
        await interaction.reply({
          content: `Adicione o bot ao seu servidor: https://newsletterbot.audibert.dev`,
          ephemeral: true,
        });
      } else if (interaction.customId.startsWith("tabNewsButton:")) {
        const slug = interaction.customId.split(":")[1];
        await interaction.reply({
          content: `Leia essa notícia no TabNews: https://www.tabnews.com.br/NewsletterOficial/${slug}`,
          ephemeral: true,
        });
      }
    }
  } catch (error) {
    console.error("Erro ao processar interação:", error);
    if (interaction.isRepliable() && !interaction.replied) {
      interaction
        .reply({
          content: "Ocorreu um erro ao processar sua solicitação.",
          ephemeral: true,
        })
        .catch(console.error);
    }
  }
});

async function startNewsCheck() {
  console.log("Iniciando verificação periódica de notícias...");

  const checkAndSendNews = async () => {
    try {
      const news = await getLatestNews();
      if (!news) {
        console.log("Nenhuma notícia encontrada na API.");
        return;
      }

      const lastSentNewsSlug = await db.get("lastSentNewsSlug");

      if (lastSentNewsSlug === news.slug) {
        console.log("Nenhuma notícia nova encontrada");
        return;
      }

      // Atualiza o slug antes de começar a enviar, para evitar duplicatas em caso de erro parcial.
      await db.set("lastSentNewsSlug", news.slug);
      console.log(`Nova notícia detectada (Slug: ${news.slug}). Enviando...`);

      const guildConfigs = await db.all();
      let sentToAnyGuild = false;

      for (const config of guildConfigs) {
        if (config.id.startsWith("guild_") && config.value.newsChannel) {
          const guildId = config.id.replace(/^guild_/, "").split(".")[0];

          const channel = await client.channels
            .fetch(config.value.newsChannel)
            .catch(() => null);
          if (channel && channel.type === ChannelType.GuildText) {
            const payload = createNewsEmbed(news);
            let roleId =
              config.value && config.value.newsRole
                ? config.value.newsRole
                : null;
            if (!roleId) {
              try {
                roleId = await db.get(`guild_${guildId}.newsRole`);
              } catch (e) {
                roleId = null;
              }
            }

            const sendPayload = { ...payload };
            if (roleId) {
              sendPayload.content = `<@&${roleId}>`;
              sendPayload.allowedMentions = { roles: [roleId] };
            }

            await channel.send(sendPayload).catch(console.error);
            sentToAnyGuild = true;
          }
        }
      }

      if (sentToAnyGuild) {
        console.log(`Notícia (Slug: ${news.slug}) enviada com sucesso.`);
      } else {
        console.log("Nenhum canal configurado para receber a nova notícia.");
      }
    } catch (err) {
      console.error("Erro ao verificar notícias:", err);
    }
  };

  await checkAndSendNews();
  setInterval(checkAndSendNews, 5 * 60 * 1000);
}

client.on("shardDisconnect", () => {
  console.log("Shard desconectado, tentando reconectar...");
  client.login(process.env.TOKEN).catch(console.error);
});

client.login(process.env.TOKEN).catch((error) => {
  console.error("Erro ao fazer login:", error);
  setTimeout(() => client.login(process.env.TOKEN).catch(console.error), 5000);
});

import {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  ActivityType,
  ChannelType,
} from "discord.js";
import { config } from "dotenv";
import fetch from "node-fetch";
import { QuickDB } from "quick.db";
import { createNewsEmbed } from "./utils/embeds.js";
import { getLatestNews } from "./utils/api.js";
import { CanalCommand } from "./commands/canal.js";
import { CargoCommand } from "./commands/cargo.js";
import { MenuCommand } from "./commands/menu.js";

// Carregar variáveis de ambiente
config();

// Inicializar banco de dados
const db = new QuickDB();

// Criar instância do cliente
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// Registrar comandos
const commands = [
  CanalCommand.data.toJSON(),
  CargoCommand.data.toJSON(),
  MenuCommand.data.toJSON(),
];
const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

// Quando o bot estiver pronto
client.once("ready", async () => {
  console.log(`Bot iniciado como ${client.user.tag}`);

  // Definir status do bot
  client.user.setActivity("📰 Últimas notícias", {
    type: ActivityType.Watching,
  });

  // Registrar comandos globalmente
  try {
    await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), {
      body: commands,
    });
    console.log("Comandos registrados com sucesso!");
  } catch (error) {
    console.error("Erro ao registrar comandos:", error);
  }

  // Iniciar verificação periódica de notícias
  startNewsCheck();
});

// Lidar com interações (comandos e botões)
client.on("interactionCreate", async (interaction) => {
  try {
    if (interaction.isCommand()) {
      if (interaction.commandName === "canal") {
        await CanalCommand.execute(interaction, db);
      } else if (interaction.commandName === "cargo") {
        await CargoCommand.execute(interaction, db);
      } else if (interaction.commandName === "menu") {
        await MenuCommand.execute(interaction, db);
      }
    } else if (interaction.isButton()) {
      if (interaction.customId === "sourceButton") {
        await interaction.reply({
          content: "Redirecionando para a fonte...",
          ephemeral: true,
        });
      } else if (interaction.customId === "inviteButton") {
        const inviteLink = `https://newsletter.audibert.dev`;
        await interaction.reply({
          content: `Adicione o bot ao seu servidor: ${inviteLink}`,
          ephemeral: true,
        });
      }
    }
  } catch (error) {
    console.error("Erro ao processar interação:", error);
  }
});

// Função para verificar novas notícias
async function startNewsCheck() {
  console.log("Iniciando verificação periódica de notícias...");

  let lastNewsId = null;

  // Função para verificar e enviar notícias
  const checkAndSendNews = async () => {
    try {
      const news = await getLatestNews();

      if (news && (!lastNewsId || news.id !== lastNewsId)) {
        lastNewsId = news.id;

        const guildConfigs = await db.all();
        for (const config of guildConfigs) {
          if (config.id.startsWith("guild_") && config.value.newsChannel) {
            const channelId = config.value.newsChannel;
            try {
              const channel = await client.channels.fetch(channelId);
              if (channel && channel.type === ChannelType.GuildText) {
                const embed = createNewsEmbed(news);
                const roleId = config.value.newsRole;
                const mentionText = roleId ? `<@&${roleId}>` : "";
                await channel.send({ content: mentionText, ...embed });
              }
            } catch (err) {
              console.error(
                `Erro ao enviar notícia para o canal ${channelId}:`,
                err
              );
            }
          }
        }
      }
    } catch (error) {
      console.error("Erro ao verificar notícias:", error);
    }
  };

  // Executar imediatamente ao iniciar
  await checkAndSendNews();

  // Repetir a cada 5 minutos
  setInterval(checkAndSendNews, 5 * 60 * 1000);
}

// Login do bot
client.login(process.env.TOKEN);

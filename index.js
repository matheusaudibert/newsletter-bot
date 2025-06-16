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

// Tratamento global de erros para garantir que o bot não caia
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
  // Bot continua funcionando mesmo com erros não tratados
});

process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
  // Bot continua funcionando mesmo com exceções não tratadas
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
    // Continua a execução mesmo com erro nos comandos
  }

  // Iniciar verificação periódica de notícias
  startNewsCheck();
});

// Lidar com erros de conexão
client.on("shardError", (error) => {
  console.error("Um erro de conexão ocorreu:", error);
});

// Lidar com interações (comandos e botões)
client.on("interactionCreate", async (interaction) => {
  try {
    // Verifica se a interação ainda é válida
    if (!interaction.isRepliable()) {
      return;
    }

    if (interaction.isCommand()) {
      if (interaction.commandName === "canal") {
        await CanalCommand.execute(interaction, db).catch((error) => {
          console.error("Erro ao executar comando /canal:", error);
          if (interaction.isRepliable() && !interaction.replied)
            interaction
              .reply({
                content: "Ocorreu um erro ao processar o comando.",
                ephemeral: true,
              })
              .catch(console.error);
        });
      } else if (interaction.commandName === "cargo") {
        await CargoCommand.execute(interaction, db).catch((error) => {
          console.error("Erro ao executar comando /cargo:", error);
          if (interaction.isRepliable() && !interaction.replied)
            interaction
              .reply({
                content: "Ocorreu um erro ao processar o comando.",
                ephemeral: true,
              })
              .catch(console.error);
        });
      } else if (interaction.commandName === "menu") {
        await MenuCommand.execute(interaction, db).catch((error) => {
          console.error("Erro ao executar comando /menu:", error);
          if (interaction.isRepliable() && !interaction.replied)
            interaction
              .reply({
                content: "Ocorreu um erro ao processar o comando.",
                ephemeral: true,
              })
              .catch(console.error);
        });
      }
    } else if (interaction.isButton()) {
      if (interaction.customId === "inviteButton") {
        const inviteLink = `https://newsletterbot.audibert.dev`;

        await interaction
          .reply({
            content: `Adicione o bot ao seu servidor através do website oficial: ${inviteLink}`,
            ephemeral: true,
          })
          .catch(console.error);
      }
      // Novo handler para tabNewsButton com slug
      if (interaction.customId.startsWith("tabNewsButton:")) {
        const slug = interaction.customId.split(":")[1];
        const tabNewsLink = `https://www.tabnews.com.br/NewsletterOficial/${slug}`;
        await interaction
          .reply({
            content: `Leia essa notícia diretamente no TabNews: ${tabNewsLink}`,
            ephemeral: true,
          })
          .catch(console.error);
      }
    }
  } catch (error) {
    console.error("Erro ao processar interação:", error);
    // Tenta responder se ainda não respondeu e se a interação ainda permite resposta
    if (interaction && interaction.isRepliable() && !interaction.replied) {
      interaction
        .reply({
          content: "Ocorreu um erro ao processar sua solicitação.",
          ephemeral: true,
        })
        .catch(console.error);
    }
  }
});

// Função para verificar novas notícias
async function startNewsCheck() {
  console.log("Iniciando verificação periódica de notícias...");

  let lastNewsId = null;
  let isFirstRun = true;

  const checkAndSendNews = async () => {
    try {
      const news = await getLatestNews();

      if (news && (!lastNewsId || news.id !== lastNewsId)) {
        if (isFirstRun) {
          // Apenas registrar a notícia como a última no primeiro ciclo
          lastNewsId = news.id;
          isFirstRun = false;
          console.log(
            `Notícia detectada no primeiro ciclo (ID: ${news.id}). Armazenada, mas não enviada.`
          );
          return;
        }

        lastNewsId = news.id;
        console.log(
          `Nova notícia encontrada: "${news.title}" (ID: ${news.id})`
        );

        const guildConfigs = await db.all();
        for (const config of guildConfigs) {
          if (config.id.startsWith("guild_") && config.value.newsChannel) {
            const channelId = config.value.newsChannel;
            try {
              const channel = await client.channels
                .fetch(channelId)
                .catch((err) => null);

              if (channel && channel.type === ChannelType.GuildText) {
                const messages = await channel.messages.fetch({ limit: 1 });
                const lastMessage = messages.first();

                const isAlreadySent =
                  lastMessage &&
                  lastMessage.author.id === client.user.id &&
                  lastMessage.embeds.length > 0 &&
                  lastMessage.embeds[0].footer &&
                  lastMessage.embeds[0].footer.text.includes(news.id);

                if (!isAlreadySent) {
                  const embed = createNewsEmbed(news);
                  const roleId = config.value.newsRole;
                  const mentionText = roleId ? `<@&${roleId}>` : "";
                  await channel.send({ content: mentionText, ...embed });
                } else {
                  console.log(
                    `Notícia já enviada no canal ${channelId}, pulando.`
                  );
                }
              }
            } catch (err) {
              console.error(
                `Erro ao processar canal ${channelId} no servidor ${config.id}:`,
                err
              );
            }
          }
        }
      } else {
        console.log("Nenhuma notícia nova encontrada");
      }
    } catch (error) {
      console.error("Erro ao verificar notícias:", error);
    }
  };

  // Executar imediatamente ao iniciar
  checkAndSendNews().catch((err) =>
    console.error("Erro na primeira verificação:", err)
  );

  // Repetir a cada 5 minutos
  setInterval(() => {
    checkAndSendNews().catch((err) =>
      console.error("Erro durante verificação programada:", err)
    );
  }, 5 * 60 * 1000);
}

// Reconexão em caso de problemas
client.on("disconnect", () => {
  console.log("Bot desconectado, tentando reconectar...");
  client.login(process.env.TOKEN).catch(console.error);
});

// Login do bot com tratamento de erro
client.login(process.env.TOKEN).catch((error) => {
  console.error("Erro ao fazer login:", error);
  // Tenta fazer login novamente após 5 segundos
  setTimeout(() => {
    console.log("Tentando fazer login novamente...");
    client.login(process.env.TOKEN).catch(console.error);
  }, 5000);
});

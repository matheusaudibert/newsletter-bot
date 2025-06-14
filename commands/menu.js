import { SlashCommandBuilder, EmbedBuilder } from "discord.js";

export const MenuCommand = {
  data: new SlashCommandBuilder()
    .setName("menu")
    .setDescription("Mostra a configuração atual do bot"),

  async execute(interaction, db) {
    // Buscar configurações do servidor
    const guildId = interaction.guildId;
    const newsChannel = await db.get(`guild_${guildId}.newsChannel`);
    const newsRole = await db.get(`guild_${guildId}.newsRole`);

    const embed = new EmbedBuilder()
      .setColor("#5865F2")
      .setTitle("Configurações do Bot de Newsletter")
      .setDescription(
        "Aqui estão as configurações atuais do bot neste servidor:"
      )
      .addFields(
        {
          name: "Canal de notícias",
          value: newsChannel
            ? `<#${newsChannel}>`
            : "Não configurado. Use `/canal` para configurar.",
        },
        {
          name: "Cargo a mencionar",
          value: newsRole
            ? `<@&${newsRole}>`
            : "Não configurado. Use `/cargo` para configurar.",
        }
      )
      .setTimestamp()
      .setFooter({ text: "Newsletter" });

    interaction.reply({
      embeds: [embed],
      ephemeral: true,
    });
  },
};

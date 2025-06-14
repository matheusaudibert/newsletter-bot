import { SlashCommandBuilder, ChannelType } from "discord.js";

export const CanalCommand = {
  data: new SlashCommandBuilder()
    .setName("canal")
    .setDescription("Define o canal para receber notícias")
    .addChannelOption((option) =>
      option
        .setName("canal")
        .setDescription("O canal onde as notícias serão enviadas")
        .setRequired(true)
        .addChannelTypes(ChannelType.GuildText)
    ),

  async execute(interaction, db) {
    const channel = interaction.options.getChannel("canal");

    if (!channel || channel.type !== ChannelType.GuildText) {
      return interaction.reply({
        content: "Por favor, selecione um canal de texto válido.",
        ephemeral: true,
      });
    }

    // Salvar configuração no banco de dados
    await db.set(`guild_${interaction.guildId}.newsChannel`, channel.id);

    interaction.reply({
      content: `Canal de notícias configurado com sucesso para ${channel}!`,
      ephemeral: true,
    });
  },
};

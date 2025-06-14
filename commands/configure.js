import {
  SlashCommandBuilder,
  ModalBuilder,
  ActionRowBuilder,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";

export const ConfigureCommand = {
  data: new SlashCommandBuilder()
    .setName("configurar")
    .setDescription("Configura o canal para receber notícias"),

  async execute(interaction) {
    // Criar modal para configuração
    const modal = new ModalBuilder()
      .setCustomId("configureModal")
      .setTitle("Configurar Canal de Notícias");

    // Adicionar input para o ID do canal
    const channelInput = new TextInputBuilder()
      .setCustomId("channelId")
      .setLabel("ID do Canal")
      .setPlaceholder("Insira o ID do canal para receber notícias")
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    const firstRow = new ActionRowBuilder().addComponents(channelInput);
    modal.addComponents(firstRow);

    // Mostrar o modal ao usuário
    await interaction.showModal(modal);
  },
};

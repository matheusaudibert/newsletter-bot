import { SlashCommandBuilder } from "discord.js";

export const CargoCommand = {
  data: new SlashCommandBuilder()
    .setName("cargo")
    .setDescription("Define o cargo para mencionar nas notícias")
    .addRoleOption((option) =>
      option
        .setName("cargo")
        .setDescription(
          "O cargo que será mencionado (ou deixe em branco para remover)"
        )
        .setRequired(false)
    ),

  async execute(interaction, db) {
    const role = interaction.options.getRole("cargo");

    if (role) {
      // Salvar configuração no banco de dados
      await db.set(`guild_${interaction.guildId}.newsRole`, role.id);
      interaction.reply({
        content: `Cargo a ser mencionado configurado com sucesso!`,
        ephemeral: true,
      });
    } else {
      // Nenhum cargo foi fornecido, então remover a configuração
      await db.delete(`guild_${interaction.guildId}.newsRole`);
      interaction.reply({
        content: `O cargo para menção nas notícias foi removido.`,
        ephemeral: true,
      });
    }
  },
};

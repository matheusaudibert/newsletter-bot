import { SlashCommandBuilder } from "discord.js";

export const CargoCommand = {
  data: new SlashCommandBuilder()
    .setName("cargo")
    .setDescription("Define o cargo para mencionar nas notícias")
    .addRoleOption((option) =>
      option
        .setName("cargo")
        .setDescription(
          "O cargo que será mencionado quando novas notícias forem enviadas"
        )
        .setRequired(true)
    ),

  async execute(interaction, db) {
    const role = interaction.options.getRole("cargo");

    // Salvar configuração no banco de dados
    await db.set(`guild_${interaction.guildId}.newsRole`, role.id);

    interaction.reply({
      content: `Cargo configurado com sucesso! Agora ${role} será mencionado quando novas notícias forem enviadas.`,
      ephemeral: true,
    });
  },
};

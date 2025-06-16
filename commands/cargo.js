import { SlashCommandBuilder } from "discord.js";

export const CargoCommand = {
  data: new SlashCommandBuilder()
    .setName("cargo")
    .setDescription("Define ou remove o cargo para mencionar nas notícias")
    .addRoleOption((option) =>
      option
        .setName("cargo")
        .setDescription(
          "O cargo a ser mencionado, ou selecione o atual para remover"
        )
        .setRequired(false)
    ),

  async execute(interaction, db) {
    const newRole = interaction.options.getRole("cargo");
    const guildConfigKey = `guild_${interaction.guildId}.newsRole`;
    const currentRoleId = await db.get(guildConfigKey);

    if (newRole) {
      // Usuário forneceu um cargo
      if (currentRoleId && currentRoleId === newRole.id) {
        // O cargo fornecido é o mesmo que o atual, então remover
        await db.delete(guildConfigKey);
        interaction.reply({
          content: `O cargo <@&${newRole.id}> foi removido das menções de notícias.`,
          ephemeral: true,
        });
      } else {
        // É um novo cargo ou não havia cargo antes, então definir/atualizar
        await db.set(guildConfigKey, newRole.id);
        interaction.reply({
          content: `O cargo <@&${newRole.id}> foi configurado para ser mencionado nas notícias!`,
          ephemeral: true,
        });
      }
    } else {
      // Nenhum cargo foi fornecido
      if (currentRoleId) {
        // Havia um cargo configurado, então remover
        await db.delete(guildConfigKey);
        interaction.reply({
          content: `O cargo para menção nas notícias foi removido. Ninguém será mencionado.`,
          ephemeral: true,
        });
      } else {
        // Nenhum cargo fornecido e nenhum cargo estava configurado
        interaction.reply({
          content: `Nenhum cargo estava configurado para menção e nenhum foi selecionado.`,
          ephemeral: true,
        });
      }
    }
  },
};

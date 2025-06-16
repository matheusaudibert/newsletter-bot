import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from "discord.js";

export function createNewsEmbed(news) {
  // Criar embed com informações da notícia
  const embed = new EmbedBuilder()
    .setColor("#5865F2")
    .setTitle(news.title)
    .setDescription(news.body)
    .setURL(news.url)
    .setTimestamp(new Date(news.published_at))
    .setFooter({
      text: "Newsletter",
      iconURL: "https://filipedeschamps.com.br/avatar-big.png",
    });

  // Adicionar botões
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setLabel("Adicionar Newsletter")
      .setStyle(ButtonStyle.Primary)
      .setCustomId("inviteButton"),
    new ButtonBuilder()
      .setLabel("Ler no TabNews")
      .setStyle(ButtonStyle.Success)
      .setCustomId(`tabNewsButton:${news.slug}`),
    new ButtonBuilder()
      .setLabel("Acessar fonte")
      .setStyle(ButtonStyle.Link)
      .setURL(news.source_url)
  );

  return { embeds: [embed], components: [row] };
}

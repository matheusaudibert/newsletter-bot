import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from "discord.js";

export function createNewsEmbed(news) {
  const embed = new EmbedBuilder()
    .setColor("#5865F2")
    .setTitle(news.title)
    .setURL(news.source_url || "https://www.tabnews.com.br/NewsletterOficial")
    .setDescription(
      (() => {
        const raw = news.body || "Sem conteúdo disponível para esta notícia.";
        const trimmed = raw.trim();
        const max = 4096;
        if (trimmed.length > max) return trimmed.slice(0, max - 3) + "...";
        return trimmed;
      })()
    )
    .setTimestamp(new Date(news.published_at))
    .setFooter({
      text: "Newsletter",
      iconURL: "https://filipedeschamps.com.br/avatar-big.png",
    });

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

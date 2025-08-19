import fetch from "node-fetch";

const API_LIST_URL =
  "https://www.tabnews.com.br/api/v1/contents/NewsletterOficial?per_page=1";
const API_DETAIL_URL =
  "https://www.tabnews.com.br/api/v1/contents/NewsletterOficial/";

export async function getLatestNews() {
  try {
    const headers = {
      Cookie: `api_key_beta=${process.env.APY_KEY_BETA}`,
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0 Safari/537.36",
    };

    const listResponse = await fetch(API_LIST_URL, { headers });
    if (!listResponse.ok) {
      throw new Error(
        `Falha ao obter lista de notícias: ${listResponse.status}`
      );
    }
    const listData = await listResponse.json();
    if (!Array.isArray(listData) || listData.length === 0) {
      return null;
    }
    const latestMeta = listData[0];

    const detailResponse = await fetch(API_DETAIL_URL + latestMeta.slug, {
      headers,
    });
    if (!detailResponse.ok) {
      throw new Error(
        `Falha ao obter detalhes da notícia: ${detailResponse.status}`
      );
    }
    const newsDetail = await detailResponse.json();
    return newsDetail;
  } catch (error) {
    console.error("Erro ao buscar notícia:", error);
    return null;
  }
}

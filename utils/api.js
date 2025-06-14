import fetch from "node-fetch";

const API_URL = "https://newsletter.audibert.dev/api/v1/latest";

export async function getLatestNews() {
  try {
    const response = await fetch(API_URL);

    if (!response.ok) {
      throw new Error(`Falha ao obter notícias: ${response.status}`);
    }

    const data = await response.json();
    console.log("Notícias obtidas com sucesso:", data);
    return data;
  } catch (error) {
    console.error("Erro ao buscar notícias:", error);
    return null;
  }
}

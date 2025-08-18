import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

const API_LIST_URL =
  "https://www.tabnews.com.br/api/v1/contents/NewsletterOficial?per_page=1";
const API_DETAIL_URL =
  "https://www.tabnews.com.br/api/v1/contents/NewsletterOficial/";

async function runCurl(url) {
  try {
    const { stdout } = await execFileAsync("curl", [
      "-sS",
      "-f",
      "-H",
      "Accept: application/json",
      url,
    ]);
    return JSON.parse(stdout);
  } catch (err) {
    throw new Error(`curl falhou ao acessar ${url}: ${err.message}`);
  }
}

export async function getLatestNews() {
  try {
    const listData = await runCurl(API_LIST_URL);
    if (!Array.isArray(listData) || listData.length === 0) {
      return null;
    }
    const latestMeta = listData[0];

    const newsDetail = await runCurl(API_DETAIL_URL + latestMeta.slug);
    return newsDetail;
  } catch (error) {
    console.error("Erro ao buscar notícia:", error);
    return null;
  }
}

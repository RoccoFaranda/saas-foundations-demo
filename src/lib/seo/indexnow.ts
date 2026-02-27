import { getAbsoluteUrl, getSiteUrl } from "./metadata";
import { INDEXABLE_ROUTES } from "./routes";

const INDEXNOW_ENDPOINT = "https://api.indexnow.org/indexnow";

export function getIndexNowKey(): string | null {
  const key = process.env.INDEXNOW_KEY?.trim();
  return key ? key : null;
}

export function getIndexNowKeyLocation(): string {
  const explicitKeyLocation = process.env.INDEXNOW_KEY_LOCATION?.trim();
  return explicitKeyLocation || getAbsoluteUrl("/indexnow-key");
}

export function getDefaultIndexNowUrls(): string[] {
  return INDEXABLE_ROUTES.map((route) => getAbsoluteUrl(route.path));
}

export async function submitIndexNowUrls(urls: string[]): Promise<{ submitted: number }> {
  const key = getIndexNowKey();

  if (!key) {
    throw new Error("INDEXNOW_KEY is required to submit IndexNow updates.");
  }

  const dedupedUrls = [...new Set(urls.map((url) => url.trim()).filter(Boolean))];
  if (dedupedUrls.length === 0) {
    return { submitted: 0 };
  }

  const payload = {
    host: getSiteUrl().host,
    key,
    keyLocation: getIndexNowKeyLocation(),
    urlList: dedupedUrls,
  };

  const response = await fetch(INDEXNOW_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `IndexNow submission failed (${response.status} ${response.statusText}): ${body}`
    );
  }

  return { submitted: dedupedUrls.length };
}

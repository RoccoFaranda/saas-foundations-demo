import type { MetadataRoute } from "next";
import { getAbsoluteUrl } from "@/src/lib/seo/metadata";
import { INDEXABLE_ROUTES } from "@/src/lib/seo/routes";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return INDEXABLE_ROUTES.map((entry) => ({
    url: getAbsoluteUrl(entry.path),
    lastModified,
    changeFrequency: entry.changeFrequency,
    priority: entry.priority,
  }));
}

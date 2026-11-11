import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/dashboard", "/join/", "/api/", "/auth/", "/reset-password"] }],
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}

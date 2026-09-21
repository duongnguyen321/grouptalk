import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL || "https://grouptalk.t5edu.site";

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/session", "/session/new/", "/contribute", "/questions"],
        disallow: [
          "/session/*/play",
          "/session/*/code",
          "/session/*/history",
          "/session/manage",
          "/api/",
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}

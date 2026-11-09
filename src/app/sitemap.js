import { HELP_PAGES } from "../../shared/help-content.mjs";
export const dynamic = "force-dynamic";
export default function sitemap() {
  const origin = process.env.APP_ORIGIN || "https://biblediaries.co.za";
  return [
    "",
    "about",
    "features",
    "how-it-works",
    "pc",
    "faq",
    "support",
    "safety",
    "security",
    "community-guidelines",
    "legal",
    "privacy",
    "terms",
    "cookies",
    "child-safety",
    "policies/community",
    "guardian",
    "account-deletion",
    ...Object.keys(HELP_PAGES).map((id) => `help/${id}`),
  ].map((p) => ({
    url: origin + (p ? "/" + p : "/"),
    changeFrequency: "monthly",
    priority: p ? 0.6 : 1,
  }));
}

import { readFileSync } from "node:fs";
import path from "node:path";
import meta from "@/site-html/meta.json";

export type SiteName = keyof typeof meta;

export function siteMetadata(name: SiteName) {
  const { title, description } = meta[name];
  return { title, description };
}

export function SiteHtml({ name }: { name: SiteName }) {
  const html = readFileSync(path.join(process.cwd(), "src/site-html", `${name}.html`), "utf8");
  return <div data-site={name} suppressHydrationWarning dangerouslySetInnerHTML={{ __html: html }} />;
}

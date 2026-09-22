import { SiteHtml, siteMetadata } from "@/lib/sitepage";

export const metadata = siteMetadata("exemplo");
export default function Page() { return <SiteHtml name="exemplo" />; }

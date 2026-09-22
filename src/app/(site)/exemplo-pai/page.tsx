import { SiteHtml, siteMetadata } from "@/lib/sitepage";

export const metadata = siteMetadata("exemplo-pai");
export default function Page() { return <SiteHtml name="exemplo-pai" />; }

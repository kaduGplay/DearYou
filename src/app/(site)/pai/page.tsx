import { SiteHtml, siteMetadata } from "@/lib/sitepage";

export const metadata = siteMetadata("pai");
export default function Page() { return <SiteHtml name="pai" />; }

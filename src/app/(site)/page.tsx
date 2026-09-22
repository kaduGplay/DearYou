import { SiteHtml, siteMetadata } from "@/lib/sitepage";

export const metadata = siteMetadata("home");
export default function Page() { return <SiteHtml name="home" />; }

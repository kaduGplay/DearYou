import "./original.css";
import SiteEnhancer from "@/components/SiteEnhancer";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="playfair_display_e63399fd-module__QZypQW__variable inter_6eb1298b-module__Ox-vVW__variable font-sans antialiased">
      {children}
      <SiteEnhancer />
    </div>
  );
}

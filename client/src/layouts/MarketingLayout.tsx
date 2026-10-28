import React, { useEffect } from "react";
import { Navbar, Footer } from "../components/marketing/layout";
import { Toaster } from "../components/ui/sonner";

interface MarketingLayoutProps {
  children?: React.ReactNode;
}

const MarketingLayout: React.FC<MarketingLayoutProps> = ({ children }) => {
  useEffect(() => {
    window.scrollTo(0, 0);

  //  const linkId = "morse-marketing-stylesheet";
  //   let link = document.getElementById(linkId) as HTMLLinkElement | null;
  //   if (!link) {
  //     link = document.createElement("link");
  //     link.id = linkId;
  //     link.rel = "stylesheet";
  //     link.href = "/css/marketing.css";
  //     document.head.appendChild(link);
  //   }

  //   return () => {
  //     // Optional: keep or remove when switching to CRM admin app
  //   };
    
  }, []);

  return (
    <div className="morse-crm-website-wrapper" style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Navbar />
      <main id="main-content" style={{ flex: "1 0 auto" }}>
        {children}
      </main>
      <Footer />
      <Toaster position="top-right" richColors />
    </div>
  );
};

export default MarketingLayout;

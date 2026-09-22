import React from "react";
import type { Metadata } from "next";
import { fetchClubData, buildTenantMetadata, buildSportsClubSchema } from "@/lib/tenantSeo";

interface LayoutProps {
  children: React.ReactNode;
  params: {
    subdomain: string;
  };
}

export async function generateMetadata({ params }: LayoutProps): Promise<Metadata> {
  const clubData = await fetchClubData(params.subdomain);
  return buildTenantMetadata(params.subdomain, clubData);
}

export default async function TenantLayout({ children, params }: LayoutProps) {
  const clubData = await fetchClubData(params.subdomain);
  const schema = buildSportsClubSchema(params.subdomain, clubData);

  const branding = clubData?.branding;
  const primaryColor = branding?.color_primario || "#10b981";
  const secondaryColor = branding?.color_secundario || "#047857";
  const accentColor = branding?.color_acento || "#06b6d4";
  const bgColor = branding?.color_fondo || "#020617";

  const rootStyle: React.CSSProperties = {
    // @ts-ignore
    "--club-primary": primaryColor,
    "--club-secondary": secondaryColor,
    "--club-accent": accentColor,
    "--club-bg": bgColor,
    backgroundColor: bgColor,
    minHeight: "100vh",
  };

  return (
    <div
      className="tenant-root min-h-screen text-slate-100 flex flex-col font-sans transition-colors duration-200"
      style={rootStyle}
    >
      <script
        id={`schema-sportsclub-${params.subdomain}`}
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
      {children}
    </div>
  );
}

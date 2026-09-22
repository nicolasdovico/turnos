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

  return (
    <div className="tenant-root min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <script
        id={`schema-sportsclub-${params.subdomain}`}
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
      {children}
    </div>
  );
}

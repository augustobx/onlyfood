import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "SuperAdmin Console | NanoLabs OnlyFood SaaS",
  description: "Panel central de administración de la plataforma SaaS OnlyFood de NanoLabs",
};

export default function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased selection:bg-orange-500 selection:text-white">
      {children}
    </div>
  );
}

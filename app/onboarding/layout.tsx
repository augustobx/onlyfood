import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Crea tu Tienda Online | NanoLabs OnlyFood SaaS",
  description: "Lanza tu menú digital, pedidos por WhatsApp y delivery propio en menos de 2 minutos.",
};

export default function OnboardingLayout({
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

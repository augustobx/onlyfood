"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { LayoutNanoLabs } from "@/components/nanolabs-visual/LayoutNanoLabs";
import { useERPTheme } from "@/components/nanolabs-visual/ThemeContext";
import { AdminShellClassic } from "./AdminShellClassic";

/**
 * Shell oficial de administración de OnlyFood.
 * Por defecto y de forma fija utiliza el Tema 2 oficial (NanoLabs Visual).
 * El Tema 1 clásico se mantiene completamente respaldado en AdminShellClassic
 * y puede ser invocado mediante ?theme=1 o cambio de estado.
 */
export function AdminShell({
  children,
  enabledFeatures = [],
  tenantName = "OnlyFood",
  tenantLogo = null,
  userName = "Administrador",
  currentRole = "ADMIN",
}: {
  children: React.ReactNode;
  enabledFeatures?: string[];
  tenantName?: string;
  tenantLogo?: string | null;
  userName?: string;
  currentRole?: string;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { theme } = useERPTheme();

  // El ticket térmico debe ser el único contenido del documento.
  // Mantener el layout montado generaría una zona en blanco en rollos térmicos.
  if (pathname.startsWith("/admin/live/print/")) return <>{children}</>;

  // Si se solicita explícitamente el tema clásico por parámetro o estado, se renderiza el respaldo
  const forceClassic = searchParams?.get("theme") === "1" || theme === "1";
  if (forceClassic) {
    return (
      <AdminShellClassic
        enabledFeatures={enabledFeatures}
        tenantName={tenantName}
        tenantLogo={tenantLogo}
        userName={userName}
        currentRole={currentRole}
      >
        {children}
      </AdminShellClassic>
    );
  }

  // Por defecto oficial: Theme 2 (NanoLabs Visual)
  return (
    <LayoutNanoLabs
      tenantName={tenantName}
      tenantLogo={tenantLogo}
      userName={userName}
      currentRole={currentRole}
      enabledFeatures={enabledFeatures}
    >
      {children}
    </LayoutNanoLabs>
  );
}

"use client";

import React, { useState, useEffect } from "react";
import { loginAdmin } from "@/app/actions/admin-auth";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Login } from "@/components/intro/Login";
import "@/components/intro/base.css";
import "@/components/intro/login.css";

export interface AdminLoginFormProps {
  tenantName?: string;
  tenantArea?: string;
  tenantBajada?: string;
  tenantLogo?: string | null;
}

export default function AdminLoginForm({
  tenantName = "OnlyFood",
  tenantArea = "OnlyFood · Gestión Gastronómica",
  tenantBajada = "Sistema de gestión integral gastronómica y pedidos.",
  tenantLogo = null,
}: AdminLoginFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    document.body.style.pointerEvents = "auto";
    document.body.removeAttribute("data-scroll-locked");
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await loginAdmin(email, password);
    if (res.success) {
      toast.success("Acceso concedido");
      router.refresh();
      setTimeout(() => {
        window.location.reload();
      }, 350);
    } else {
      const msg = res.error || "Credenciales incorrectas";
      setError(msg);
      toast.error(msg);
      setLoading(false);
    }
  };

  return (
    <Login
      modo="ingreso"
      config={{
        producto: tenantName,
        area: tenantArea,
        bajada: tenantBajada,
      }}
      ingreso={{
        email,
        setEmail,
        password,
        setPassword,
        loading,
        error,
        onSubmit: handleLogin,
        logoUrl: tenantLogo,
      }}
    />
  );
}

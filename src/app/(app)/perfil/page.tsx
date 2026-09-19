"use client";

import { useRouter } from "next/navigation";
import { User } from "lucide-react";
import { PlaceholderScreen } from "@/components/placeholder-screen";
import { Button } from "@/components/ui/button";
import { clearSession, getUsuario } from "@/lib/api-client";

export default function PerfilPage() {
  const router = useRouter();
  const usuario = getUsuario();

  function handleLogout() {
    clearSession();
    router.push("/login");
  }

  return (
    <PlaceholderScreen
      icon={User}
      title={usuario ? `${usuario.nome} ${usuario.sobrenome}` : "Perfil do usuário"}
      description="Em breve você poderá alterar seus dados, e-mail e senha por aqui."
      action={
        <Button variant="brand-secondary" onClick={handleLogout}>
          Sair
        </Button>
      }
    />
  );
}

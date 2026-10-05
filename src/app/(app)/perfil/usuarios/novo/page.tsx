"use client";

import { useRouter } from "next/navigation";
import { BackLink } from "@/components/back-link";
import { createUsuario } from "@/lib/api/usuarios";
import { cn } from "@/lib/utils";
import { UsuarioForm, type UsuarioFormValues } from "../usuario-form";
import { useSomenteAdmin } from "../use-somente-admin";
import styles from "../usuario-form.module.css";

export default function NovoUsuarioPage() {
  const router = useRouter();
  const admin = useSomenteAdmin();

  async function cadastrar(values: UsuarioFormValues) {
    // primeiro_acesso sempre enviado explicitamente (o admin decide no checkbox).
    await createUsuario({ ...values, senha: values.senha });
    router.push("/perfil");
  }

  if (!admin) return null;

  return (
    <div className={cn(styles.page, "pt-safe")}>
      <BackLink href="/perfil" />
      <h1 className={styles.title}>Cadastrar Usuário</h1>
      <UsuarioForm onSubmit={cadastrar} />
    </div>
  );
}

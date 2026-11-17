"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { BackLink } from "@/components/back-link";
import { BotaoExcluir } from "@/components/botao-excluir";
import { getUsuario, updateUsuarioLocal } from "@/lib/api-client";
import { deleteUsuario, fetchUsuario, updateUsuario } from "@/lib/api/usuarios";
import type { Usuario } from "@/lib/api/types";
import { mensagemDeErro } from "@/lib/offline/rede";
import { cn } from "@/lib/utils";
import { UsuarioForm, type UsuarioFormValues } from "../usuario-form";
import { useSomenteAdmin } from "../use-somente-admin";
import styles from "../usuario-form.module.css";

export default function EditarUsuarioPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const admin = useSomenteAdmin();
  const [usuario, setUsuario] = React.useState<Usuario | null>(null);
  const [loadError, setLoadError] = React.useState<string | null>(null);

  const proprioUsuario = getUsuario()?.usuario_id === Number(params.id);

  React.useEffect(() => {
    if (!admin) return;
    let cancelled = false;
    fetchUsuario(params.id)
      .then((dados) => {
        if (!cancelled) setUsuario(dados);
      })
      .catch((err: unknown) => {
        if (!cancelled) setLoadError(mensagemDeErro(err, "Erro ao carregar."));
      });
    return () => {
      cancelled = true;
    };
  }, [admin, params.id]);

  async function salvar(values: UsuarioFormValues) {
    const { senha, ...campos } = values;
    // Senha só vai quando preenchida (redefine); em branco mantém a atual.
    const atualizado = await updateUsuario(params.id, { ...campos, ...(senha ? { senha } : {}) });
    // Editou o próprio cadastro: mantém o usuário guardado no aparelho em dia.
    if (proprioUsuario) updateUsuarioLocal(atualizado);
    router.push("/configuracoes/usuarios");
  }

  if (!admin) return null;

  return (
    <div className={cn("page-container page-narrow", styles.page, "pt-safe")}>
      <div className="page-header-acoes">
        <BackLink href="/configuracoes/usuarios" />
        {/* A própria conta não pode ser excluída (a API também recusa). Se a API recusar
            (ex.: "A empresa precisa ter pelo menos um administrador."), o motivo aparece num aviso. */}
        {usuario && !proprioUsuario ? (
          <BotaoExcluir
            descricao={`o usuário ${usuario.nome} ${usuario.sobrenome}`}
            excluir={() => deleteUsuario(params.id)}
            destino="/configuracoes/usuarios"
          />
        ) : null}
      </div>
      <h1 className="page-title">Editar Usuário</h1>

      {!usuario && !loadError ? <div className="state-box glass-panel">Carregando usuário...</div> : null}
      {loadError ? <div className="state-box state-error glass-panel">{loadError}</div> : null}

      {usuario ? <UsuarioForm usuario={usuario} onSubmit={salvar} /> : null}
    </div>
  );
}

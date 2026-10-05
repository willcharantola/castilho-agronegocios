"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { BackLink } from "@/components/back-link";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { getUsuario, updateUsuarioLocal } from "@/lib/api-client";
import { deleteUsuario, fetchUsuario, updateUsuario } from "@/lib/api/usuarios";
import type { Usuario } from "@/lib/api/types";
import { mensagemDeErro } from "@/lib/offline/rede";
import { useOnlineStatus } from "@/lib/offline/use-online-status";
import { cn } from "@/lib/utils";
import { UsuarioForm, type UsuarioFormValues } from "../usuario-form";
import { useSomenteAdmin } from "../use-somente-admin";
import styles from "../usuario-form.module.css";

export default function EditarUsuarioPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const admin = useSomenteAdmin();
  const online = useOnlineStatus();
  const [usuario, setUsuario] = React.useState<Usuario | null>(null);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [confirmandoExclusao, setConfirmandoExclusao] = React.useState(false);
  const [excluindo, setExcluindo] = React.useState(false);
  const [excluirError, setExcluirError] = React.useState<string | null>(null);

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
    router.push("/perfil");
  }

  async function excluir() {
    setExcluirError(null);
    setExcluindo(true);
    try {
      await deleteUsuario(params.id);
      router.push("/perfil");
    } catch (err) {
      // Ex.: "A empresa precisa ter pelo menos um administrador."
      setExcluirError(mensagemDeErro(err, "Erro ao excluir."));
      setExcluindo(false);
    }
  }

  if (!admin) return null;

  return (
    <div className={cn(styles.page, "pt-safe")}>
      <BackLink href="/perfil" />
      <h1 className={styles.title}>Editar Usuário</h1>

      {!usuario && !loadError ? <div className={cn(styles.state, "glass-panel")}>Carregando usuário...</div> : null}
      {loadError ? <div className={cn(styles.state, styles.stateError, "glass-panel")}>{loadError}</div> : null}

      {usuario ? (
        <UsuarioForm
          usuario={usuario}
          onSubmit={salvar}
          acoesExtras={
            // A própria conta não pode ser excluída (a API também recusa).
            proprioUsuario ? null : (
              <>
                {excluirError ? <p className={styles.submitError}>{excluirError}</p> : null}
                <Button
                  type="button"
                  variant="ghost"
                  size="xl"
                  className={styles.deleteButton}
                  disabled={!online || excluindo}
                  onClick={() => setConfirmandoExclusao(true)}
                >
                  Excluir usuário
                </Button>
              </>
            )
          }
        />
      ) : null}

      <Dialog open={confirmandoExclusao} onOpenChange={setConfirmandoExclusao} title="Excluir usuário?">
        <p className={styles.dialogText}>
          {usuario ? `${usuario.nome} ${usuario.sobrenome} (${usuario.email}) perderá o acesso ao sistema. ` : ""}
          Esta ação não pode ser desfeita.
        </p>
        <div className={styles.dialogActions}>
          <Button
            type="button"
            size="xl"
            className={styles.dangerButton}
            disabled={excluindo}
            onClick={() => {
              setConfirmandoExclusao(false);
              void excluir();
            }}
          >
            Excluir definitivamente
          </Button>
          <Button type="button" variant="ghost" size="xl" className="w-full" onClick={() => setConfirmandoExclusao(false)}>
            Cancelar
          </Button>
        </div>
      </Dialog>
    </div>
  );
}

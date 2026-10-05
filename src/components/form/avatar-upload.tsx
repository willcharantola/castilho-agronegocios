"use client";

import * as React from "react";
import { Camera, Loader2, Warehouse } from "lucide-react";
import { getUploadUrlMarca, type UploadMarcaTipo } from "@/lib/api/uploads";
import { mensagemDeErro } from "@/lib/offline/rede";
import { useOnlineStatus } from "@/lib/offline/use-online-status";
import { cn } from "@/lib/utils";
import styles from "./avatar-upload.module.css";

const TIPOS_ACEITOS: UploadMarcaTipo[] = ["image/jpeg", "image/png", "image/webp"];
const TAMANHO_MAXIMO = 5 * 1024 * 1024;
const MENSAGEM_ARQUIVO_INVALIDO = "Envie uma imagem JPG, PNG ou WebP de até 5 MB.";

/**
 * Campo circular (estilo foto de perfil) para a marca da fazenda. O arquivo vai direto
 * ao S3 por uma URL pré-assinada pedida à API; o formulário recebe só a URL pública.
 */
export function AvatarUpload({
  id,
  value,
  onChange,
  onUploadingChange,
  disabled,
}: {
  id: string;
  value: string | null;
  onChange: (url: string | null) => void;
  /** Avisa o formulário para não salvar enquanto o envio não termina. */
  onUploadingChange?: (enviando: boolean) => void;
  disabled?: boolean;
}) {
  const online = useOnlineStatus();
  const inputRef = React.useRef<HTMLInputElement>(null);
  // Preview local (objectURL) — mostrado durante o envio e mantido depois, para a
  // imagem não "piscar" enquanto a versão do S3 carrega.
  const [preview, setPreview] = React.useState<string | null>(null);
  const [enviando, setEnviando] = React.useState(false);
  const [erro, setErro] = React.useState<string | null>(null);

  React.useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const bloqueado = disabled || enviando || !online;
  const imagem = preview ?? value;

  async function aoEscolherArquivo(event: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = event.target.files?.[0];
    // Permite escolher o mesmo arquivo de novo depois de um erro.
    event.target.value = "";
    if (!arquivo) return;

    if (!TIPOS_ACEITOS.includes(arquivo.type as UploadMarcaTipo) || arquivo.size > TAMANHO_MAXIMO) {
      setErro(MENSAGEM_ARQUIVO_INVALIDO);
      return;
    }

    setErro(null);
    setPreview(URL.createObjectURL(arquivo));
    setEnviando(true);
    onUploadingChange?.(true);
    try {
      const { uploadUrl, finalUrl } = await getUploadUrlMarca(arquivo.type as UploadMarcaTipo);
      // Direto ao S3: sem o api-client e sem o header Authorization. O Content-Type
      // precisa ser o mesmo informado à API (faz parte da assinatura).
      const resposta = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": arquivo.type },
        body: arquivo,
      });
      if (!resposta.ok) throw new Error(`O armazenamento recusou a imagem (${resposta.status}).`);
      onChange(finalUrl);
    } catch (err) {
      setPreview(null);
      setErro(`Não foi possível enviar a imagem. ${mensagemDeErro(err, "")}`.trim());
    } finally {
      setEnviando(false);
      onUploadingChange?.(false);
    }
  }

  function remover() {
    setPreview(null);
    setErro(null);
    onChange(null);
  }

  return (
    <div className={styles.wrap}>
      <button
        type="button"
        className={cn(styles.circle, "glass-panel")}
        onClick={() => inputRef.current?.click()}
        disabled={bloqueado}
        aria-label={imagem ? "Trocar a marca da fazenda" : "Enviar a marca da fazenda"}
      >
        {imagem ? (
          // Imagem externa (S3) ou objectURL local: <img> simples, sem otimização do next/image.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imagem} alt="Marca da fazenda" className={styles.image} />
        ) : (
          <Warehouse size={40} className={styles.placeholder} aria-hidden />
        )}
        {enviando ? (
          <span className={styles.overlay}>
            <Loader2 size={28} className={styles.spinner} aria-hidden />
          </span>
        ) : null}
        <span className={styles.badge} aria-hidden>
          <Camera size={16} />
        </span>
      </button>

      <input
        ref={inputRef}
        id={id}
        type="file"
        accept={TIPOS_ACEITOS.join(",")}
        hidden
        onChange={aoEscolherArquivo}
      />

      <p className={styles.label}>Marca da fazenda (opcional)</p>
      {!online ? <p className={styles.hint}>Envio de imagem indisponível sem internet.</p> : null}
      {enviando ? <p className={styles.hint}>Enviando imagem...</p> : null}
      {erro ? <p className={styles.error}>{erro}</p> : null}
      {imagem && !enviando ? (
        <button type="button" className={styles.remove} onClick={remover} disabled={disabled}>
          Remover
        </button>
      ) : null}
    </div>
  );
}

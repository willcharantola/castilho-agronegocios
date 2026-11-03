"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { FileText, MapPin, Type, Warehouse } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { BackLink } from "@/components/back-link";
import { BotaoExcluir } from "@/components/botao-excluir";
import { BotaoMapa } from "@/components/botao-mapa";
import { LocalizacaoFields, localizacaoSchema } from "@/components/localizacao-fields";
import { Field } from "@/components/form/field";
import { AvatarUpload } from "@/components/form/avatar-upload";
import { IconField } from "@/components/form/icon-field";
import { TintedInput } from "@/components/form/tinted-input";
import { Button } from "@/components/ui/button";
import { fetchFazenda, updateFazenda, deleteFazenda } from "@/lib/api/fazendas";
import type { Pecuarista } from "@/lib/api/types";
import { ApiError } from "@/lib/api-client";
import { urlMapaEmbutido } from "@/lib/mapa";
import { useOnlineStatus } from "@/lib/offline/use-online-status";
import styles from "./page.module.css";

const schema = z.object({
  nome_fazenda: z.string().min(2, "Informe o nome da fazenda.").max(50),
  municipio: z.string().min(2, "Informe o município.").max(20),
  inscricao_estadual: z.string().min(1, "Informe a inscrição estadual.").max(12),
  // URL pública no S3, preenchida pelo AvatarUpload (opcional; null = sem imagem).
  marca_url: z.string().nullable().optional(),
  marca_escrita: z.string().max(10, "Máximo de 10 caracteres.").optional(),
  ...localizacaoSchema,
});
type FormValues = z.infer<typeof schema>;

export default function EditarFazendaPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const [loaded, setLoaded] = React.useState(false);
  const [nome, setNome] = React.useState("");
  const [excluirError, setExcluirError] = React.useState<string | null>(null);
  const [pecuaristas, setPecuaristas] = React.useState<Pecuarista[]>([]);
  const [enviandoMarca, setEnviandoMarca] = React.useState(false);
  // marca_url como veio da API: só é reenviada se mudar (trocada ou removida).
  const [marcaOriginal, setMarcaOriginal] = React.useState<string | null>(null);
  const online = useOnlineStatus();
  // Localização como está salva: o mapa e o botão refletem o gravado, não o digitado.
  const [salvo, setSalvo] = React.useState<{ localizacao: string | null; endereco: string | null }>({
    localizacao: null,
    endereco: null,
  });
  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  React.useEffect(() => {
    let cancelled = false;
    fetchFazenda(params.id)
      .then((fazenda) => {
        if (cancelled) return;
        reset({
          nome_fazenda: fazenda.nome_fazenda,
          municipio: fazenda.municipio,
          inscricao_estadual: fazenda.inscricao_estadual,
          marca_url: fazenda.marca_url ?? null,
          marca_escrita: fazenda.marca_escrita ?? "",
          endereco_fazenda: fazenda.endereco_fazenda ?? "",
          localizacao_google: fazenda.localizacao_google ?? "",
        });
        setMarcaOriginal(fazenda.marca_url ?? null);
        setSalvo({ localizacao: fazenda.localizacao_google ?? null, endereco: fazenda.endereco_fazenda ?? null });
        setPecuaristas((fazenda.pecuarista_fazenda ?? []).map((a) => a.pecuarista));
        setNome(fazenda.nome_fazenda);
        setLoaded(true);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setLoadError(err instanceof ApiError || err instanceof Error ? err.message : "Erro ao carregar.");
      });
    return () => {
      cancelled = true;
    };
  }, [params.id, reset]);

  async function onSubmit(values: FormValues) {
    setSubmitError(null);
    try {
      const { marca_url: marcaUrl, ...demais } = values;
      const marca = marcaUrl ?? null;
      await updateFazenda(params.id, {
        ...demais,
        // Removida → null (limpa no banco); inalterada → omitida.
        ...(marca !== marcaOriginal ? { marca_url: marca } : {}),
        marca_escrita: values.marca_escrita || undefined,
        // Apagados → null (limpa no banco).
        endereco_fazenda: values.endereco_fazenda || null,
        localizacao_google: values.localizacao_google || null,
      });
      router.push("/fazendas");
    } catch (err) {
      setSubmitError(err instanceof ApiError || err instanceof Error ? err.message : "Erro ao salvar.");
    }
  }

  return (
    <div className="page-container page-narrow pt-safe">
      <div className="page-header-acoes">
        <BackLink href="/fazendas" />
        {loaded ? (
          <BotaoExcluir
            descricao={`a fazenda "${nome}"`}
            excluir={() => deleteFazenda(params.id)}
            destino="/fazendas"
            onErro={setExcluirError}
          />
        ) : null}
      </div>
      <h1 className="page-title">Editar Fazenda</h1>

      {!loaded && !loadError ? <div className="state-box glass-panel">Carregando fazenda...</div> : null}
      {loadError ? <div className="state-box state-error glass-panel">{loadError}</div> : null}
      {excluirError ? <p className="form-error">{excluirError}</p> : null}

      {loaded ? (
        <form onSubmit={handleSubmit(onSubmit)} className="form-stack">
          <div className="form-fields">
            {submitError ? <p className="form-error">{submitError}</p> : null}

            <Controller
              control={control}
              name="marca_url"
              render={({ field }) => (
                <AvatarUpload
                  id="marca_url"
                  value={field.value ?? null}
                  onChange={field.onChange}
                  onUploadingChange={setEnviandoMarca}
                  disabled={isSubmitting}
                />
              )}
            />

            <IconField icon={Warehouse} label="Nome Fazenda" htmlFor="nome_fazenda" error={errors.nome_fazenda?.message}>
              <TintedInput id="nome_fazenda" tint="pink" {...register("nome_fazenda")} />
            </IconField>

            <IconField icon={MapPin} label="Município" htmlFor="municipio" error={errors.municipio?.message}>
              <TintedInput id="municipio" tint="pink" {...register("municipio")} />
            </IconField>

            <IconField icon={FileText} label="Inscrição Estadual" htmlFor="inscricao_estadual" error={errors.inscricao_estadual?.message}>
              <TintedInput id="inscricao_estadual" tint="pink" {...register("inscricao_estadual")} />
            </IconField>


            <IconField icon={Type} label="Marca escrita" htmlFor="marca_escrita" error={errors.marca_escrita?.message}>
              <TintedInput id="marca_escrita" tint="pink" maxLength={10} {...register("marca_escrita")} />
            </IconField>

            <LocalizacaoFields register={register} setValue={setValue} errors={errors} />

            <BotaoMapa localizacao={salvo.localizacao} endereco={salvo.endereco} className={styles.botaoMapa} />
            {/* Pré-visualização só com coordenadas e com internet; senão fica só o botão. */}
            {urlMapaEmbutido(salvo.localizacao) && online ? (
              <iframe
                title="Mapa da fazenda"
                src={urlMapaEmbutido(salvo.localizacao)!}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className={styles.mapa}
              />
            ) : null}

            <Field label="Pecuaristas associados" htmlFor="pecuaristas">
              {pecuaristas.length === 0 ? (
                <p className="state-box">Nenhum pecuarista associado a esta fazenda.</p>
              ) : (
                <ul>
                  {pecuaristas.map((v) => (
                    <li key={v.pecuarista_id}>{v.nome_pecuarista}</li>
                  ))}
                </ul>
              )}
            </Field>
          </div>

          <Button type="submit" variant="brand" size="xl" className="w-full" disabled={isSubmitting || enviandoMarca}>
            {isSubmitting ? "Salvando..." : enviandoMarca ? "Enviando imagem..." : "Salvar"}
          </Button>
        </form>
      ) : null}
    </div>
  );
}

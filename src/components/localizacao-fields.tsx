"use client";

import * as React from "react";
import { Crosshair, Home, MapPinned } from "lucide-react";
import type { FieldErrors, UseFormRegister, UseFormSetValue } from "react-hook-form";
import { z } from "zod";
import { IconField } from "@/components/form/icon-field";
import { TintedInput } from "@/components/form/tinted-input";
import { Button } from "@/components/ui/button";
import { formatarCoordenadas, localizacaoValida } from "@/lib/mapa";
import styles from "./localizacao-fields.module.css";

/** Campos opcionais da fazenda: endereço e localização (link do Maps ou "lat,lng"). */
export const localizacaoSchema = {
  endereco_fazenda: z.string().trim().max(200, "Máximo de 200 caracteres.").optional(),
  localizacao_google: z
    .string()
    .trim()
    .max(500, "Máximo de 500 caracteres.")
    .refine(
      (v) => v === "" || localizacaoValida(v),
      "Use um link do Google Maps ou coordenadas no formato -20.7123,-51.6543."
    )
    .optional(),
};

type CamposLocalizacao = { endereco_fazenda?: string; localizacao_google?: string };

/** Mensagens do navegador ao pedir a posição (GeolocationPositionError.code). */
const ERROS_GPS: Record<number, string> = {
  1: "Permissão de localização negada. Libere o acesso à localização nas configurações do navegador.",
  2: "Não foi possível obter a localização agora. Verifique se o GPS está ligado.",
  3: "A localização demorou demais para responder. Tente de novo ao ar livre.",
};

/**
 * Endereço + localização, com "Usar minha localização atual" (GPS do aparelho — funciona
 * sem internet). Usado no cadastro e na edição da fazenda.
 */
export function LocalizacaoFields<T extends CamposLocalizacao>({
  register,
  setValue,
  errors,
}: {
  register: UseFormRegister<T>;
  setValue: UseFormSetValue<T>;
  errors: FieldErrors<T>;
}) {
  const [buscando, setBuscando] = React.useState(false);
  const [erroGps, setErroGps] = React.useState<string | null>(null);
  // Os campos são opcionais e iguais em todos os formulários que usam este componente.
  const reg = register as unknown as UseFormRegister<CamposLocalizacao>;
  const set = setValue as unknown as UseFormSetValue<CamposLocalizacao>;
  const erros = errors as FieldErrors<CamposLocalizacao>;

  function usarLocalizacaoAtual() {
    setErroGps(null);
    if (!("geolocation" in navigator)) {
      setErroGps("Este aparelho não oferece localização.");
      return;
    }
    setBuscando(true);
    navigator.geolocation.getCurrentPosition(
      (posicao) => {
        set("localizacao_google", formatarCoordenadas(posicao.coords.latitude, posicao.coords.longitude), {
          shouldValidate: true,
          shouldDirty: true,
        });
        setBuscando(false);
      },
      (erro) => {
        setErroGps(ERROS_GPS[erro.code] ?? "Não foi possível obter a localização.");
        setBuscando(false);
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 60000 }
    );
  }

  return (
    <>
      <IconField icon={Home} label="Endereço (opcional)" htmlFor="endereco_fazenda" error={erros.endereco_fazenda?.message}>
        <TintedInput
          id="endereco_fazenda"
          tint="pink"
          maxLength={200}
          placeholder="Ex: Rodovia MS-134, km 20"
          {...reg("endereco_fazenda")}
        />
      </IconField>

      <IconField
        icon={MapPinned}
        label="Localização (link do Google Maps ou coordenadas)"
        htmlFor="localizacao_google"
        error={erros.localizacao_google?.message}
      >
        <TintedInput
          id="localizacao_google"
          tint="pink"
          maxLength={500}
          inputMode="url"
          autoCapitalize="none"
          autoCorrect="off"
          placeholder="Ex: -20.7123,-51.6543"
          {...reg("localizacao_google")}
        />
      </IconField>
      <div className={styles.gps}>
        <Button type="button" variant="ghost" onClick={usarLocalizacaoAtual} disabled={buscando}>
          <Crosshair size={16} aria-hidden /> {buscando ? "Obtendo localização..." : "Usar minha localização atual"}
        </Button>
        {erroGps ? <p className="form-error">{erroGps}</p> : null}
      </div>
    </>
  );
}

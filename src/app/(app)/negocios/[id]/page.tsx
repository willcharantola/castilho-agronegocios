"use client";

import { useParams } from "next/navigation";
import { NegocioDetalhe } from "./negocio-detalhe";

export default function NegocioDetailPage() {
  const params = useParams<{ id: string }>();
  return <NegocioDetalhe negocioId={Number(params.id)} />;
}

import { NextResponse } from "next/server";
import { db } from "@/prisma/db";
import type { NegocioListItem } from "@/lib/api/negocios";

export async function GET() {
  try {
    const rows = await db.orm.public.Negocio.select(
      "negocioId",
      "fazenda",
      "vendedor",
      "dataNegocio",
      "comissao",
      "qtdAnimais"
    )
      .orderBy((n) => n.dataNegocio.desc())
      .all();

    const negocios: NegocioListItem[] = rows.map((row) => ({
      negocioId: row.negocioId,
      fazenda: row.fazenda,
      vendedor: row.vendedor,
      dataNegocio: new Date(row.dataNegocio).toISOString(),
      comissao: Number(row.comissao),
      qtdAnimais: row.qtdAnimais,
    }));

    return NextResponse.json(negocios);
  } catch (error) {
    console.error("GET /api/negocios failed:", error);
    return NextResponse.json(
      { error: "Não foi possível carregar os negócios cadastrados." },
      { status: 500 }
    );
  }
}

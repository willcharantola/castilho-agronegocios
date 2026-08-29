import { NextResponse } from "next/server";
import { db } from "@/prisma/db";
import type { NegocioDetail } from "@/lib/api/negocios";

export async function GET(_req: Request, ctx: RouteContext<"/api/negocios/[id]">) {
  const { id } = await ctx.params;
  const negocioId = Number(id);

  if (!Number.isInteger(negocioId)) {
    return NextResponse.json({ error: "Id de negócio inválido." }, { status: 400 });
  }

  try {
    const negocio = await db.orm.public.Negocio.include("gados", (g) =>
      g.orderBy((x) => x.denominacao.asc())
    ).first({ negocioId });

    if (!negocio) {
      return NextResponse.json({ error: "Negócio não encontrado." }, { status: 404 });
    }

    const detail: NegocioDetail = {
      negocioId: negocio.negocioId,
      fazenda: negocio.fazenda,
      vendedor: negocio.vendedor,
      merchant: negocio.merchant,
      comprador: negocio.comprador,
      rendimentoCarcaca: Number(negocio.rendimentoCarcaca),
      valorArroba: Number(negocio.valorArroba),
      modalidade: negocio.modalidade,
      valorTotal: negocio.valorTotal !== null ? Number(negocio.valorTotal) : null,
      valorMedio: negocio.valorMedio !== null ? Number(negocio.valorMedio) : null,
      qtdAnimais: negocio.qtdAnimais,
      comissao: Number(negocio.comissao),
      dataNegocio: new Date(negocio.dataNegocio).toISOString(),
      gados: negocio.gados.map((gado) => ({
        gadoId: Number(gado.gadoId),
        denominacao: String(gado.denominacao),
        genero: String(gado.genero),
        pesoTotal: Number(gado.pesoTotal),
        pesoCalculo: Number(gado.pesoCalculo),
        pesoArroba: Number(gado.pesoArroba),
        valorTotal: gado.valorTotal !== null ? Number(gado.valorTotal) : null,
      })),
    };

    return NextResponse.json(detail);
  } catch (error) {
    console.error(`GET /api/negocios/${id} failed:`, error);
    return NextResponse.json({ error: "Não foi possível carregar o negócio." }, { status: 500 });
  }
}

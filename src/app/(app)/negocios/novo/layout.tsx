import { NegocioFlowProvider } from "@/lib/flows/negocio-flow";

export default function NovoNegocioLayout({ children }: { children: React.ReactNode }) {
  return <NegocioFlowProvider>{children}</NegocioFlowProvider>;
}

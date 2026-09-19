import { VendedorFlowProvider } from "@/lib/flows/vendedor-flow";

export default function NovoVendedorLayout({ children }: { children: React.ReactNode }) {
  return <VendedorFlowProvider>{children}</VendedorFlowProvider>;
}

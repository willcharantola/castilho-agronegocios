import { CadastroFlowProvider } from "@/lib/flows/cadastro-flow";

export default function CadastroLayout({ children }: LayoutProps<"/cadastro">) {
  return <CadastroFlowProvider>{children}</CadastroFlowProvider>;
}

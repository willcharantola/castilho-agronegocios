import { RecuperarSenhaFlowProvider } from "@/lib/flows/recuperar-senha-flow";

export default function RecuperarSenhaLayout({ children }: LayoutProps<"/recuperar-senha">) {
  return <RecuperarSenhaFlowProvider>{children}</RecuperarSenhaFlowProvider>;
}

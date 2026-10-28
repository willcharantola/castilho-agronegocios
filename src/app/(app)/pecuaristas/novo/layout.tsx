import { PecuaristaFlowProvider } from "@/lib/flows/pecuarista-flow";

export default function NovoPecuaristaLayout({ children }: { children: React.ReactNode }) {
  return <PecuaristaFlowProvider>{children}</PecuaristaFlowProvider>;
}

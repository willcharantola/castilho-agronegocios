import { LoginFlowProvider } from "@/lib/flows/login-flow";

export default function LoginLayout({ children }: LayoutProps<"/login">) {
  return <LoginFlowProvider>{children}</LoginFlowProvider>;
}

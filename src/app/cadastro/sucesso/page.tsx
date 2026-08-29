import Link from "next/link";
import { MailCheck } from "lucide-react";
import { IconBadge } from "@/components/icon-badge";
import { MobileScreen } from "@/components/mobile-screen";
import { Button } from "@/components/ui/button";
import styles from "./page.module.css";

export default function CadastroSucessoPage() {
  return (
    <MobileScreen className={styles.screen}>
      <IconBadge icon={MailCheck} />
      <h1 className={styles.title}>Conta criada!</h1>
      <p className={styles.description}>
        Seu cadastro foi enviado para aprovação do administrador da Castilho Agronegócios. Você
        receberá um e-mail assim que sua conta for liberada.
      </p>
      <Button
        render={<Link href="/login" />}
        variant="brand"
        size="xl"
        className={styles.button}
      >
        Voltar para o login
      </Button>
    </MobileScreen>
  );
}

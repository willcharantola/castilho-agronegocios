import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/logo";
import { MobileScreen } from "@/components/mobile-screen";
import styles from "./page.module.css";

export default async function LoginPage(props: PageProps<"/login">) {
  const searchParams = await props.searchParams;
  const status = typeof searchParams.status === "string" ? searchParams.status : undefined;

  return (
    <MobileScreen className={styles.screen}>
      {status ? (
        <div className={`${styles.banner} glass-panel`}>
          <CheckCircle2 className={styles.bannerIcon} size={20} />
          {status === "reset-success"
            ? "Senha redefinida com sucesso! Faça login com sua nova senha."
            : "Cadastro enviado! Aguarde a aprovação do administrador."}
        </div>
      ) : null}

      <div className={styles.content}>
        <Logo />

        <div className={styles.actions}>
          <Button
            render={<Link href="/login/email" />}
            variant="brand"
            size="xl"
            className={styles.button}
          >
            Fazer Login
          </Button>
          <Link href="/cadastro" className={styles.registerLink}>
            Cadastrar nova conta
          </Link>
        </div>
      </div>
    </MobileScreen>
  );
}

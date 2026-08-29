import { redirect } from "next/navigation";

export default function RootPage() {
  // Auth is out of scope for this MVP milestone (see instrucoes.md) — go straight to Home.
  redirect("/home");
}

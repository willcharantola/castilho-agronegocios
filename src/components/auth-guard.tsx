"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { getToken } from "@/lib/api-client";

/** Gates its children behind a valid local session, redirecting to /login otherwise. */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [checked, setChecked] = React.useState(false);

  React.useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    // Syncing React state from localStorage (an external system) — safe.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setChecked(true);
  }, [router]);

  if (!checked) return null;

  return <>{children}</>;
}

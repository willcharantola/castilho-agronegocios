"use client";

import { useEffect, useState } from "react";

export function useOnlineStatus() {
  const [online, setOnline] = useState(true);
  useEffect(() => {
    // Sincroniza com o estado do navegador (sistema externo) ao montar.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOnline(navigator.onLine);
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);
  return online;
}

"use client";

import { useEffect, useState } from "react";

type Tema = "sistema" | "light" | "dark";
const SIGUIENTE: Record<Tema, Tema> = { sistema: "light", light: "dark", dark: "sistema" };
const ETIQUETA: Record<Tema, string> = { sistema: "Tema: sistema", light: "Tema: claro", dark: "Tema: oscuro" };

export function BotonTema() {
  const [tema, setTema] = useState<Tema>("sistema");

  useEffect(() => {
    const t = document.documentElement.dataset.theme;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sincroniza con el valor aplicado antes de hidratar
    if (t === "light" || t === "dark") setTema(t);
  }, []);

  function cambiar() {
    const nuevo = SIGUIENTE[tema];
    setTema(nuevo);
    if (nuevo === "sistema") delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = nuevo;
    try {
      if (nuevo === "sistema") localStorage.removeItem("tema");
      else localStorage.setItem("tema", nuevo);
    } catch {}
  }

  return (
    <button
      type="button"
      onClick={cambiar}
      className="rounded-md border border-line px-2.5 py-1 text-sm text-ink-2 hover:text-ink"
      aria-label={`${ETIQUETA[tema]}. Cambiar tema`}
    >
      {ETIQUETA[tema]}
    </button>
  );
}

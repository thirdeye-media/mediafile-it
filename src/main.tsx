import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import Landing from "./Landing.tsx";
import "./index.css";

function Root() {
  const [entered, setEntered] = useState(false);
  const [lang, setLang] = useState<"en" | "es">(() =>
    navigator.language.startsWith("es") ? "es" : "en"
  );

  if (entered) return <App lang={lang} setLang={setLang} />;
  return <Landing onEnter={() => setEntered(true)} lang={lang} setLang={setLang} />;
}

createRoot(document.getElementById("root")!).render(<Root />);

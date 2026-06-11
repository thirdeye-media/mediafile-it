import React from "react";
import { Globe, ArrowRight, ExternalLink } from "lucide-react";

// Sanity-inspired tokens (DESIGN.md)
const C = {
  canvas:     "#0b0b0b",
  canvasSoft: "#212121",
  canvasLight:"#ffffff",
  canvasPaper:"#ededed",
  brand:      "#c0392b",
  ink:        "#0b0b0b",
  ash:        "#b9b9b9",
  mute:       "#797979",
  hairline:   "#ededed",
  hairlineSoft:"#353535",
};

const CONTENT = {
  en: {
    eyebrow:     "OPEN-SOURCE ANNOTATION TOOL",
    heading:     "MediaFile_it",
    sub:         "A thoughtful media annotation tool designed for film and audiovisual archivists. Your spreadsheet is already loaded, so you simply watch the film and prompt the LLM model whenever it helps. It offers supportive suggestions for structured metadata, which you can refine, finalise, and download to share—always keeping you, the archivist, in full control.",
    cta:         "Open the tool",
    ctaNote:     "Desktop recommended · self-hostable",
    stepsEyebrow:"HOW IT WORKS",
    steps: [
      { n:"01", title:"Load your film queue",    body:"Admins load the spreadsheet at server level. Annotators pick their name in the top bar to access their selected films." },
      { n:"02", title:"Chat while you watch",    body:"The LLM assistant reads the film context and drafts Description, Historic Context, and Aesthetic Commentary fields." },
      { n:"03", title:"Review and approve",      body:"Every draft is editable. Approve field by field. Skip entries, add annotator notes, and reassign." },
      { n:"04", title:"Export a deliverable",    body:"Download a clean CSV formatted for ingestion by your archive system or project administrator." },
    ],
    originEyebrow:"ORIGIN",
    originTitle:  "Built for independent archives",
    originBody:   "MediaFile_it grew out of Agente Fílmico, a bespoke annotation workflow for audiovisual archives with limited resources. It is self-hostable, forkable, and designed to be adapted to any collection.",
    originLink:   "Agente Fílmico project",
    originUrl:    "https://agente.mafi.tv/",
    stackEyebrow: "MODELS SUPPORTED",
    stack:        ["OpenRouter", "Gemini", "Anthropic", "Mistral"],
    ctaFooter:    "Open the tool",
    footerLine:   "Open source · Third Eye Media · Amsterdam, NL",
    lang:         "ES",
  },
  es: {
    eyebrow:     "HERRAMIENTA DE ANOTACIÓN DE CÓDIGO ABIERTO",
    heading:     "MediaFile_it",
    sub:         "Una herramienta de anotación de medios diseñada para archivistas de cine y audiovisuales. La hoja de cálculo ya está cargada; solo tienes que ver la película y consultar al modelo cuando sea útil. Ofrece sugerencias de metadatos estructurados que puedes refinar, finalizar y descargar para compartir — con el archivista siempre en control.",
    cta:         "Abrir la herramienta",
    ctaNote:     "Recomendado para escritorio · auto-alojable",
    stepsEyebrow:"CÓMO FUNCIONA",
    steps: [
      { n:"01", title:"Carga tu lista de películas",  body:"Los administradores cargan la hoja de cálculo a nivel de servidor. Los anotadores eligen su nombre en la barra superior para acceder a sus películas asignadas." },
      { n:"02", title:"Conversa mientras ves",        body:"El asistente LLM lee el contexto de la película y redacta los campos Descripción, Contexto Histórico y Comentario Estético." },
      { n:"03", title:"Revisa y aprueba",             body:"Cada borrador es editable. Aprueba campo a campo. Omite entradas, añade notas y reasigna." },
      { n:"04", title:"Exporta un entregable",        body:"Descarga un CSV limpio formateado para tu sistema de archivo o administrador de proyecto." },
    ],
    originEyebrow:"ORIGEN",
    originTitle:  "Construido para archivos independientes",
    originBody:   "MediaFile_it nació de Agente Fílmico, un flujo de anotación a medida para archivos audiovisuales con recursos limitados. Es auto-alojable, bifurcable y diseñado para adaptarse a cualquier colección.",
    originLink:   "Proyecto Agente Fílmico",
    originUrl:    "https://agente.mafi.tv/",
    stackEyebrow: "MODELOS COMPATIBLES",
    stack:        ["OpenRouter", "Gemini", "Anthropic", "Mistral"],
    ctaFooter:    "Abrir la herramienta",
    footerLine:   "Código abierto · Third Eye Media · Amsterdam, NL",
    lang:         "EN",
  },
};

interface Props {
  onEnter: () => void;
  lang: "en" | "es";
  setLang: (l: "en" | "es") => void;
}

export default function Landing({ onEnter, lang, setLang }: Props) {
  const t = CONTENT[lang];
  const mono = { fontFamily: "'JetBrains Mono', monospace" };

  return (
    <div style={{ background: C.canvasLight, color: C.ink, fontFamily: "'Inter', sans-serif", minHeight: "100vh", display: "flex", flexDirection: "column" }}>

      {/* ── Nav ── dark canvas */}
      <nav style={{ background: C.canvas, borderBottom: `1px solid ${C.hairlineSoft}`, position: "sticky", top: 0, zIndex: 20 }}>
        <div style={{ maxWidth: 960, margin: "0 auto", padding: "0 24px", height: 56, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {/* brand dot */}
            <span style={{ width: 10, height: 10, borderRadius: "50%", background: C.brand, flexShrink: 0 }} />
            <span style={{ color: C.canvasLight, fontSize: 14, fontWeight: 500, letterSpacing: "0.01em" }}>
              MediaFile_it
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <a
              href="https://github.com/thirdeye-media/mediafile-it"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: C.ash, fontSize: 13, textDecoration: "none", padding: "6px 10px" }}
            >
              GitHub
            </a>
            <a
              href="https://thirdeyefiles.net/logbook/"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: C.ash, fontSize: 13, textDecoration: "none", padding: "6px 10px" }}
            >
              Third Eye Media
            </a>
            <button
              onClick={() => setLang(lang === "en" ? "es" : "en")}
              style={{ display: "flex", alignItems: "center", gap: 5, color: C.ash, background: C.canvasSoft, border: `1px solid ${C.hairlineSoft}`, fontSize: 12, padding: "5px 10px", borderRadius: 99, cursor: "pointer", ...mono }}
            >
              <Globe size={11} />
              {t.lang}
            </button>
          </div>
        </div>
      </nav>

      {/* ── Hero ── dark canvas, two-column */}
      <section style={{ background: C.canvas, padding: "72px 24px 80px" }}>
        <div style={{ maxWidth: 960, margin: "0 auto", display: "flex", alignItems: "center", gap: 56, flexWrap: "wrap" }}>
          {/* Text column */}
          <div style={{ flex: "1 1 320px" }}>
            <p style={{ ...mono, fontSize: 11, letterSpacing: "0.12em", color: C.mute, marginBottom: 20 }}>
              {t.eyebrow}
            </p>
            <h1 style={{ fontSize: 48, fontWeight: 400, lineHeight: 1.1, letterSpacing: "-1.5px", color: C.canvasLight, margin: "0 0 20px" }}>
              {t.heading}
            </h1>
            <p style={{ fontSize: 16, lineHeight: 1.7, color: C.ash, margin: "0 0 36px" }}>
              {t.sub}
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
              <button
                onClick={onEnter}
                style={{ display: "flex", alignItems: "center", gap: 8, background: C.canvasLight, color: C.ink, border: "none", fontFamily: "inherit", fontSize: 15, fontWeight: 500, padding: "10px 22px", borderRadius: 99, cursor: "pointer" }}
              >
                {t.cta}
                <ArrowRight size={14} />
              </button>
              <span style={{ fontSize: 13, color: C.mute }}>{t.ctaNote}</span>
            </div>
          </div>
          {/* Image column */}
          <div style={{ flex: "1 1 300px", borderRadius: 6, overflow: "hidden", border: `1px solid ${C.hairlineSoft}` }}>
            <img
              src="/hero-still.jpg"
              alt="Film still — MediaFile_it annotation studio"
              style={{ display: "block", width: "100%", height: "auto" }}
            />
          </div>
        </div>
      </section>

      {/* ── Steps ── white */}
      <section style={{ background: C.canvasLight, padding: "72px 24px", borderBottom: `1px solid ${C.hairline}` }}>
        <div style={{ maxWidth: 960, margin: "0 auto" }}>
          <p style={{ ...mono, fontSize: 11, letterSpacing: "0.12em", color: C.mute, marginBottom: 40 }}>
            {t.stepsEyebrow}
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "1px", background: C.hairline }}>
            {t.steps.map((s) => (
              <div key={s.n} style={{ background: C.canvasLight, padding: "28px 28px 32px" }}>
                <p style={{ ...mono, fontSize: 11, color: C.mute, marginBottom: 12 }}>{s.n}</p>
                <p style={{ fontSize: 15, fontWeight: 500, color: C.ink, marginBottom: 10, lineHeight: 1.3 }}>{s.title}</p>
                <p style={{ fontSize: 14, color: "#555", lineHeight: 1.6, margin: 0 }}>{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Origin ── paper */}
      <section style={{ background: C.canvasPaper, padding: "64px 24px" }}>
        <div style={{ maxWidth: 960, margin: "0 auto", display: "flex", gap: 64, flexWrap: "wrap" }}>
          <div style={{ flex: "2 1 320px" }}>
            <p style={{ ...mono, fontSize: 11, letterSpacing: "0.12em", color: C.mute, marginBottom: 16 }}>
              {t.originEyebrow}
            </p>
            <h2 style={{ fontSize: 24, fontWeight: 400, letterSpacing: "-0.5px", color: C.ink, margin: "0 0 14px" }}>
              {t.originTitle}
            </h2>
            <p style={{ fontSize: 14, lineHeight: 1.7, color: "#444", margin: "0 0 16px", maxWidth: 460 }}>
              {t.originBody}
            </p>
            <a
              href={t.originUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 13, color: C.brand, textDecoration: "none", fontWeight: 500 }}
            >
              {t.originLink} <ExternalLink size={11} />
            </a>
          </div>
          <div style={{ flex: "1 1 180px" }}>
            <p style={{ ...mono, fontSize: 11, letterSpacing: "0.12em", color: C.mute, marginBottom: 16 }}>
              {t.stackEyebrow}
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {t.stack.map((item) => (
                <span key={item} style={{ fontSize: 13, color: "#444", padding: "4px 0", borderBottom: `1px solid ${C.hairline}` }}>
                  {item}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ── dark */}
      <section style={{ background: C.canvas, padding: "64px 24px", textAlign: "center" }}>
        <button
          onClick={onEnter}
          style={{ display: "inline-flex", alignItems: "center", gap: 8, background: C.brand, color: C.canvasLight, border: "none", fontFamily: "inherit", fontSize: 15, fontWeight: 500, padding: "11px 26px", borderRadius: 99, cursor: "pointer" }}
        >
          {t.ctaFooter}
          <ArrowRight size={14} />
        </button>
      </section>

      {/* ── Footer ── */}
      <footer style={{ background: C.canvas, borderTop: `1px solid ${C.hairlineSoft}`, padding: "20px 24px", textAlign: "center" }}>
        <p style={{ ...mono, fontSize: 11, color: C.mute, margin: 0, letterSpacing: "0.08em" }}>
          {t.footerLine} ·{" "}
          <a href="https://thirdeyefiles.net" target="_blank" rel="noopener noreferrer" style={{ color: C.ash, textDecoration: "none" }}>
            thirdeyefiles.net
          </a>
        </p>
      </footer>
    </div>
  );
}

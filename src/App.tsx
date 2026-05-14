import React, { useState, useEffect, useRef, useMemo } from "react";
import Papa from "papaparse";
import JSZip from "jszip";
import { Film, Message } from "./types";
import { v4 as uuidv4 } from "uuid";
import { Send, ChevronLeft, ChevronRight, Play, MessageSquare, Menu, Globe, Upload, FileText, AtSign, MonitorSmartphone, X, Download } from "lucide-react";
import { cn } from "./lib/utils";

const TRANSLATIONS = {
  en: {
    not_available: "Not Available",
    queue: "Film Queue",
    studio: "Annotation Studio",
    completion: "Completion",
    sync: "Download CSV",
    upload_csv: "Upload CSV",
    export_report: "Export Deliverable",
    desktop_recommended: "Desktop Recommended",
    desktop_warning: "This tool uses a split-screen workspace with video playback, an AI co-pilot, and metadata forms. It is tightly optimized for desktop and laptop screens.",
    continue_anyway: "Continue anyway",
    preview: "Preview",
    no_preview: "No Preview",
    active_entry: "Active Entry",
    tags: "Tags",
    no_tags: "No tags...",
    ai_assistant: "AI Assistant",
    type_observation: "Type your observation...",
    connected: "Connected to Data API",
    skip: "Skip Film",
    pending: "Pending Input...",
    recorded: "Recorded",
    waiting: "Waiting for description...",
    language_toggle: "ES",
    annotator: "Annotator",
    hello: "Hi! Let's watch this film together. What stands out to you about it? E.g., What's happening in the description? Any historical context you want to add?",
    ai_error: "*Error connecting to AI.*",
    description: "Description",
    historic: "Historic Context",
    aesthetic: "Aesthetic-Critical Commentary",
    production: "Production Commentary",
    author: "Author",
    place: "Location",
    date: "Date",
    annotator_comments: "Annotator Comments",
    filter_all: "All Annotators",
    filter_by: "Filter by Assignee",
    progress: "Goal Progress",
    approve: "Approve",
    approve_optional: "Approve (Optional)",
    approved: "Approved",
    not_started: "Not Started",
    in_progress: "In Progress",
    ready_for_review: "Ready for Review",
    almost_there: "Almost There",
    done: "Done",
    unapproved: "Needs Approval"
  },
  es: {
    not_available: "No Disponible",
    queue: "Cola de Películas",
    studio: "Estudio de Anotación",
    completion: "Completado",
    sync: "Descargar CSV",
    upload_csv: "Subir CSV",
    export_report: "Exportar Entregable",
    desktop_recommended: "Uso Recomendado en PC",
    desktop_warning: "Esta herramienta utiliza un espacio de trabajo de pantalla dividida que no está optimizado para dispositivos móviles. Se recomienda usar en computadora.",
    continue_anyway: "Continuar de todos modos",
    preview: "Vista Previa",
    no_preview: "Sin Vista",
    active_entry: "Entrada Activa",
    tags: "Etiquetas",
    no_tags: "Sin etiquetas...",
    ai_assistant: "Asistente IA",
    type_observation: "Escribe tu observación...",
    connected: "Conectado a la API",
    skip: "Saltar Película",
    pending: "Pendiente...",
    recorded: "Guardado",
    waiting: "Esperando descripción...",
    language_toggle: "EN",
    annotator: "Anotador",
    hello: "¡Hola! Observemos esta película juntos. ¿Qué te llama la atención? Por ejemplo, ¿Cómo la describirías? ¿Hay algún contexto histórico que quieras añadir?",
    ai_error: "*Error al conectar con la IA.*",
    description: "Descripción",
    historic: "Contexto Histórico",
    aesthetic: "Comentario Estético-Crítico",
    production: "Comentario de Producción",
    author: "Autor",
    place: "Lugar",
    date: "Fecha",
    annotator_comments: "Comentarios del Anotador",
    filter_all: "Todos",
    filter_by: "Filtrar por Asignado",
    progress: "Progreso de Meta",
    approve: "Aprobar",
    approve_optional: "Aprobar (Opcional)",
    approved: "Aprobado",
    not_started: "No Iniciado",
    in_progress: "En Progreso",
    ready_for_review: "Listo para Revisión",
    almost_there: "Casi Listo",
    done: "Completado",
    unapproved: "Requiere Aprobación"
  }
};

export default function App() {
  const [films, setFilms] = useState<Film[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 768);
  const [lang, setLang] = useState<'en' | 'es'>('es');
  const [reportLoading, setReportLoading] = useState(false);
  const [assigneeFilter, setAssigneeFilter] = useState('');
  const [mobileTab, setMobileTab] = useState<'metadata' | 'chat'>('metadata');
  const [chatSidebarOpen, setChatSidebarOpen] = useState(true);
  const [chatWidth, setChatWidth] = useState(400); // pixels
  const [isDraggingChat, setIsDraggingChat] = useState(false);
  const isDraggingChatRef = useRef(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLInputElement>(null);

  const t = TRANSLATIONS[lang];

  const handleMention = (fieldName: string) => {
    setInput(prev => {
      const mention = `@${fieldName} `;
      if (!prev) return mention;
      if (prev.endsWith(' ')) return prev + mention;
      return prev + ' ' + mention;
    });
    if (chatInputRef.current) {
      chatInputRef.current.focus();
    }
  };

  // Derive assignees from the currently loaded films
  const uniqueAssignees = Array.from(new Set(films.map(f => f.assigned_to?.trim()).filter(Boolean) as string[]));

  // Filter films by assignee if one is selected
  const filteredFilms = assigneeFilter 
    ? films.filter(f => f.assigned_to?.trim() === assigneeFilter)
    : films;

  // Make sure currentIndex is within bounds of filtered array
  useEffect(() => {
    if (currentIndex >= filteredFilms.length && filteredFilms.length > 0) {
      setCurrentIndex(0);
    }
  }, [filteredFilms.length, currentIndex]);

  const currentFilm = filteredFilms[currentIndex] || films[0];

  const handleUpdateCurrentFilm = (updates: Partial<Film>) => {
    if (!currentFilm) return;
    setFilms(prev => prev.map(f => f.slug === currentFilm.slug ? { ...f, ...updates } : f));
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingChatRef.current) return;
      
      // Calculate width from the right side. Screen width minus mouse X
      const newWidth = window.innerWidth - e.clientX;
      if (newWidth > 300 && newWidth < 800) {
        setChatWidth(newWidth);
      }
    };
    
    const handleMouseUp = () => {
      isDraggingChatRef.current = false;
      setIsDraggingChat(false);
      document.body.style.cursor = '';
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  const [placeholders, setPlaceholders] = useState<Record<string, string>>({});

  useEffect(() => {
    fetch("/api/placeholders")
      .then(res => res.text())
      .then(text => {
        // Parse the markdown file to extract short placeholders for each field
        // We look for ### `fieldname` and take the first paragraph
        const extracted: Record<string, string> = {};
        const lines = text.split('\n');
        let currentField = null;
        let p = "";

        for (const line of lines) {
          if (line.startsWith('### `')) {
             if (currentField && p) extracted[currentField] = p.trim();
             currentField = line.replace('### `', '').replace('`', '').trim();
             p = "";
          } else if (currentField && line.trim() !== "" && !line.startsWith('-') && !line.startsWith('#')) {
             if (!p) {
               p = line.trim(); // take just the first paragraph as description/placeholder
               extracted[currentField] = p;
             }
          }
        }
        if (currentField && p && !extracted[currentField]) extracted[currentField] = p.trim();
        setPlaceholders(extracted);
      })
      .catch(console.error);

    fetch("/api/films")
      .then((res) => res.text())
      .then((text) => {
        Papa.parse(text, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            const parsed = results.data as Film[];
            const validFilms = parsed.filter(f => f.slug);
            
            // Restore from localStorage backup to prevent data loss
            try {
              const savedEdits = localStorage.getItem('annotator_edits');
              if (savedEdits) {
                const editsMap = JSON.parse(savedEdits);
                const editableFields = [
                  'description', 'historic_context', 'aesthetic_critical_commentary', 
                  'production_commentary', 'tags', 'annotator_comments_optional',
                  'description_approved', 'historic_context_approved', 
                  'aesthetic_critical_commentary_approved', 'production_commentary_approved', 
                  'tags_approved', 'annotator_comments_optional_approved'
                ];
                validFilms.forEach(f => {
                  if (editsMap[f.slug]) {
                    editableFields.forEach(key => {
                      if (editsMap[f.slug][key] !== undefined) {
                         // @ts-ignore
                         f[key] = editsMap[f.slug][key];
                      }
                    });
                  }
                });
              }
            } catch (e) {
              console.error("Failed to restore edits from localStorage", e);
            }

            setFilms(validFilms);
          },
        });
      })
      .catch((err) => console.error("Error fetching films:", err));
  }, []);

  // Save changes to localStorage whenever films array updates
  useEffect(() => {
    if (films.length === 0) return;
    
    const editsToSave: Record<string, Partial<Film>> = {};
    films.forEach(f => {
      // We could ideally only save things that differ from the original fetch,
      // but for simplicity we'll save the whole array of relevant fields.
      editsToSave[f.slug] = {
        description: f.description,
        historic_context: f.historic_context,
        aesthetic_critical_commentary: f.aesthetic_critical_commentary,
        production_commentary: f.production_commentary,
        tags: f.tags,
        description_approved: f.description_approved,
        historic_context_approved: f.historic_context_approved,
        aesthetic_critical_commentary_approved: f.aesthetic_critical_commentary_approved,
        production_commentary_approved: f.production_commentary_approved,
        tags_approved: f.tags_approved,
        annotator_comments_optional: f.annotator_comments_optional,
        annotator_comments_optional_approved: f.annotator_comments_optional_approved
      };
    });
    localStorage.setItem('annotator_edits', JSON.stringify(editsToSave));
  }, [films]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (films.length > 0) {
      setMessages([
        { id: uuidv4(), role: "assistant", content: t.hello }
      ]);
    }
  }, [currentIndex, lang, films.length]);

  const handleSend = async () => {
    if (!input.trim() || !currentFilm) return;
    
    const userMsg: Message = { id: uuidv4(), role: "user", content: input };
    const newMessages = [...messages, userMsg];
    
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages, film: currentFilm, language: lang, currentUser: assigneeFilter }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unknown error");
      }
      
      if (data.functionCalls) {
        handleUpdateCurrentFilm(data.functionCalls);
      }

      setMessages(prev => [...prev, { id: uuidv4(), role: "assistant", content: data.text }]);

      if (data.moveToNext) {
        setTimeout(() => {
          if (currentIndex < filteredFilms.length - 1) {
            setCurrentIndex(currentIndex + 1);
          }
        }, 3000);
      }
    } catch (err: any) {
      console.error(err);
      setMessages(prev => [...prev, { id: uuidv4(), role: "assistant", content: `${t.ai_error} ${err.message ? `(${err.message})` : ''}` }]);
    } finally {
      setLoading(false);
    }
  };

  const handleUploadCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const parsed = results.data as Film[];
        const validFilms = parsed.filter(f => f.slug);
        
        if (validFilms.length > 0) {
          setFilms(validFilms);
          
          const editsToSave: Record<string, Partial<Film>> = {};
          validFilms.forEach(f => {
            editsToSave[f.slug] = {
              description: f.description,
              historic_context: f.historic_context,
              aesthetic_critical_commentary: f.aesthetic_critical_commentary,
              production_commentary: f.production_commentary,
              tags: f.tags,
              description_approved: f.description_approved,
              historic_context_approved: f.historic_context_approved,
              aesthetic_critical_commentary_approved: f.aesthetic_critical_commentary_approved,
              production_commentary_approved: f.production_commentary_approved,
              tags_approved: f.tags_approved,
              annotator_comments_optional: f.annotator_comments_optional,
              annotator_comments_optional_approved: f.annotator_comments_optional_approved
            };
          });
          localStorage.setItem('annotator_edits', JSON.stringify(editsToSave));
          
          if(e.target) e.target.value = ''; // Reset input
        }
      }
    });
  };

  const exportDeliverables = async () => {
    setReportLoading(true);
    try {
      const response = await fetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages, language: lang }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Unknown error");
      }
      
      const zip = new JSZip();

      if (data.report) {
         zip.file(`session_report_${new Date().toISOString().split('T')[0]}.md`, data.report);
      }

      // Generate chat log
      let chatLogText = "# Chat Log\n\n";
      messages.forEach(msg => {
         chatLogText += `**${msg.role === 'user' ? 'Annotator' : 'Assistant'}**:\n${msg.content}\n\n`;
      });
      zip.file(`chat_log_${new Date().toISOString().split('T')[0]}.md`, chatLogText);

      // Generate CSV
      const csv = Papa.unparse(films);
      zip.file("annotated_films_sync.csv", csv);

      const content = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(content);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `deliverables_${new Date().toISOString().split('T')[0]}.zip`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

    } catch (e: any) {
      console.error(e);
      alert("Failed to generate deliverables" + (e.message ? `: ${e.message}` : "."));
    } finally {
      setReportLoading(false);
    }
  };

  const exportCSV = () => {
    const csv = Papa.unparse(films);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "annotated_films_sync.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (films.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#0F0F0F] text-[#EBEBEB] font-mono uppercase tracking-[0.2em] text-xs">
        <div className="animate-pulse">Loading Archives...</div>
      </div>
    );
  }

  const completedCount = filteredFilms.filter(f => {
    const approvedFields = [f.description_approved, f.historic_context_approved, f.aesthetic_critical_commentary_approved, f.production_commentary_approved, f.tags_approved, f.annotator_comments_optional_approved];
    return approvedFields.filter(val => val === 'true').length === 6;
  }).length;

  return (
    <div className="flex h-screen bg-[#0F0F0F] text-[#EBEBEB] overflow-hidden font-sans">
      
      {/* Sidebar with Film List */}
      <div className={cn(
        "bg-[#0a0a0a] border-white/10 transition-all duration-300 flex flex-col shrink-0 overflow-hidden",
        sidebarOpen ? "w-[240px] md:w-[220px] border-r" : "w-0 border-r-0"
      )}>
        <div className="flex items-center justify-between p-4 border-b border-white/10 shrink-0 w-[240px] md:w-[220px]">
          <h2 className="text-[10px] uppercase tracking-[0.2em] text-white/40 font-mono">{t.queue}</h2>
          <button onClick={() => setSidebarOpen(false)} className="">
            <ChevronLeft className="w-5 h-5 text-white/40 hover:text-white transition-colors" />
          </button>
        </div>
        
        <div className="overflow-y-auto w-[240px] md:w-[220px] flex-1 p-2 space-y-1">
          {filteredFilms.map((film, index) => {
            const fields = [film.description, film.historic_context, film.aesthetic_critical_commentary, film.production_commentary, film.tags, film.annotator_comments_optional];
            const approvedFields = [film.description_approved, film.historic_context_approved, film.aesthetic_critical_commentary_approved, film.production_commentary_approved, film.tags_approved, film.annotator_comments_optional_approved];
            const filled = fields.filter(f => f && f.trim().length > 0).length;
            const approvedCount = approvedFields.filter(f => f === 'true').length;
            
            const progress = (filled / fields.length) * 100;

            let bgColor = 'bg-amber-600';
            let textColor = 'text-amber-500';
            let statusText = t.not_started;
            let barWidth = progress || 2; // Keep a sliver if empty

            if (filled === 0) {
              bgColor = 'bg-amber-600';
              textColor = 'text-amber-500';
              statusText = t.not_started;
            } else if (filled > 0 && filled < 6) {
              bgColor = 'bg-yellow-500';
              textColor = 'text-yellow-500';
              statusText = t.in_progress;
            } else if (filled === 6 && approvedCount < 6) {
              bgColor = 'bg-blue-500';
              textColor = 'text-blue-400';
              statusText = t.ready_for_review;
              barWidth = 100;
            } else if (approvedCount === 6) {
              bgColor = 'bg-emerald-500';
              textColor = 'text-emerald-400';
              statusText = t.done;
              barWidth = 100;
            }
            
            return (
              <button
                key={film.slug}
                onClick={() => {
                  setCurrentIndex(index);
                  if (window.innerWidth < 768) {
                    setSidebarOpen(false);
                  }
                }}
                className={cn(
                  "w-full text-left px-3 py-2.5 hover:bg-white/5 transition-colors group",
                  currentIndex === index && "bg-white/5 border-l-2 border-white"
                )}
              >
                <div className={cn("font-sans text-xs font-medium truncate mb-1.5", currentIndex === index ? "text-white" : "text-white/60 group-hover:text-white/90")}>
                  {film.title || `Film #${film.slug}`}
                </div>
                <div className="flex justify-between items-center text-[9px] text-white/40 uppercase font-mono tracking-widest mt-1">
                  <div className="truncate">ID: {film.slug}</div>
                  <div className="flex items-center gap-1.5">
                    <div className={cn("w-1.5 h-1.5 rounded-full", bgColor)}></div>
                    <div className={cn("font-bold truncate max-w-[80px]", textColor)}>{statusText}</div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Interface */}
      <div className="w-full md:w-auto shrink-0 md:shrink md:flex-1 min-w-0 flex flex-col bg-[#0F0F0F] transition-transform duration-300">
        
        {/* Top Navbar */}
        <header className="flex justify-between items-center px-2 md:px-6 lg:px-10 py-3 md:py-5 lg:py-6 border-b border-white/10 flex-shrink-0 flex-nowrap gap-2 overflow-x-auto">
          <div className="flex flex-col shrink-0">
            <div className="flex items-center gap-1 md:gap-3">
              {!sidebarOpen && (
                <button onClick={() => setSidebarOpen(true)} className="text-white/60 hover:text-white transition-colors">
                  <Menu className="w-4 h-4 md:w-5 md:h-5" />
                </button>
              )}
              <span className="text-xs md:text-xl uppercase tracking-[0.2em] font-mono font-bold text-[#f0b100] whitespace-nowrap">CineFile_it</span>
            </div>
          </div>
          <div className="flex flex-nowrap items-center gap-2 md:gap-6 shrink-0 justify-end border-l border-white/10 pl-2 md:pl-0 md:border-none">
            <div className="flex flex-col items-end justify-center shrink-0">
               <select 
                  value={assigneeFilter}
                  onChange={(e) => {
                    setAssigneeFilter(e.target.value);
                    setCurrentIndex(0);
                  }}
                  className="bg-transparent border-none text-[8px] md:text-[10px] uppercase tracking-widest text-[#f0b100] appearance-none text-right cursor-pointer hover:text-[#f0b100]/80 focus:outline-none p-0 focus:ring-0 font-mono mb-[1px] md:mb-0.5 max-w-[80px] md:max-w-none text-ellipsis"
                  title={t.filter_by}
               >
                  <option value="" className="bg-[#0F0F0F]">{t.filter_all}</option>
                  {uniqueAssignees.map(a => (
                    <option key={a} value={a} className="bg-[#0F0F0F]">{a}</option>
                  ))}
               </select>
              <span className="text-sm md:text-xl font-mono leading-none text-[#f0b100] whitespace-nowrap">
                {completedCount} <span className="text-[#f0b100]/50">/</span> {filteredFilms.length}
              </span>
            </div>
            
            <div className="flex items-center gap-1 shrink-0">
              <button 
                onClick={() => setLang(lang === 'en' ? 'es' : 'en')}
                className="p-1.5 md:p-2 border border-white/20 text-white/60 hover:text-white hover:border-white/50 transition-colors flex items-center justify-center rounded-sm"
                title="Toggle Language"
              >
                 <Globe className="w-3 h-3 md:w-4 md:h-4" />
              </button>
              <label 
                className="p-1.5 md:p-2 border border-white/20 text-white/60 hover:text-white hover:border-white/50 transition-colors flex items-center justify-center cursor-pointer rounded-sm"
                title={t.upload_csv}
              >
                <Upload className="w-3 h-3 md:w-4 md:h-4" />
                <input type="file" accept=".csv" className="hidden" onChange={handleUploadCSV} />
              </label>
            </div>

            <div className="flex items-center shrink-0">
              <button 
                onClick={exportDeliverables}
                disabled={reportLoading}
                className="hidden sm:flex border border-white/20 text-white px-4 py-2 text-[10px] lg:text-xs uppercase tracking-widest font-bold hover:bg-white/10 transition-colors disabled:opacity-50"
              >
                {reportLoading ? (
                  <span className="animate-pulse">...</span>
                ) : (
                   <span className="flex items-center gap-2"><FileText className="w-3 h-3"/> {t.export_report}</span>
                )}
              </button>
              <button 
                onClick={exportCSV}
                title={t.sync}
                className="bg-white text-black p-1.5 md:px-4 lg:px-6 md:py-2 text-[10px] lg:text-xs uppercase tracking-widest font-bold hover:bg-zinc-200 transition-colors shrink-0 flex items-center justify-center rounded-sm md:rounded-none"
              >
                <Download className="w-3 h-3 md:hidden" />
                <span className="hidden md:inline">{t.sync}</span>
              </button>
              
              {!chatSidebarOpen && (
                 <button 
                   onClick={() => setChatSidebarOpen(true)}
                   className="hidden md:flex ml-2 md:ml-4 text-white/40 hover:text-white transition-colors shrink-0 items-center justify-center"
                   title="Open AI Chat"
                 >
                   <ChevronLeft className="w-5 h-5" />
                 </button>
              )}
            </div>
          </div>
        </header>

        {/* Main Workspace */}
        <main className="flex-1 flex flex-col md:flex-row overflow-hidden bg-[#0F0F0F] relative">
          
          {/* Left Pane: Video & Metadata */}
          <section className={cn(
            "w-full flex flex-col border-b md:border-b-0 md:border-r border-white/10 shrink-0 md:shrink md:flex-1 min-h-0",
            mobileTab === 'metadata' ? "flex-1 overflow-hidden" : "shrink-0"
          )}>
            <div className="p-4 md:p-10 shrink-0 border-b border-white/5 md:border-none flex justify-center">
              <div 
                className="relative aspect-video bg-zinc-900 border border-white/5 shadow-2xl flex items-center justify-center group mb-0 md:mb-8 w-full mx-auto"
                style={{ maxHeight: '40vh', maxWidth: 'calc(40vh * 16 / 9)' }}
              >
                  {currentFilm.vimeo_url ? (
                     <iframe 
                      src={currentFilm.vimeo_url.replace("vimeo.com", "player.vimeo.com/video") + "?title=0&byline=0&portrait=0"}
                      className="w-full h-full border-none absolute inset-0 z-10"
                      allow="autoplay; fullscreen; picture-in-picture" 
                      allowFullScreen
                    ></iframe>
                  ) : (
                    <div className="text-white/50 text-sm flex flex-col items-center z-10">
                       <Play className="w-8 h-8 mb-2 opacity-50" />
                       <span className="text-[10px] uppercase tracking-[0.3em] font-bold">{t.no_preview}</span>
                    </div>
                  )}
              </div>
            </div>

            {/* Mobile Tab Bar */}
            <div className="md:hidden flex border-b border-white/10 shrink-0 bg-black">
               <button 
                  onClick={() => setMobileTab('metadata')}
                  className={cn(
                    "flex-1 py-3 text-xs uppercase tracking-widest transition-colors flex items-center justify-center gap-2", 
                    mobileTab === 'metadata' ? "text-white border-b-2 border-white bg-white/5 font-bold" : "text-white/40 font-medium"
                  )}
               >
                 <FileText className="w-4 h-4" /> Form
               </button>
               <button 
                  onClick={() => setMobileTab('chat')}
                  className={cn(
                    "flex-1 py-3 text-xs uppercase tracking-widest transition-colors flex items-center justify-center gap-2", 
                    mobileTab === 'chat' ? "text-emerald-400 border-b-2 border-emerald-500 bg-emerald-500/10 font-bold" : "text-emerald-500/50 font-medium"
                  )}
               >
                 <MessageSquare className="w-4 h-4" /> AI Chat
               </button>
            </div>

            <div className={cn(
              "flex-1 overflow-y-auto p-6 md:p-10 pt-4 md:pt-0 pb-10",
              mobileTab === 'chat' && "hidden md:block" // Hide metadata on mobile if chat is active
            )}>
              <div className="flex items-start justify-between mb-8">

                 <div>
                   <label className="text-[10px] uppercase tracking-widest text-white/30 block mb-2 font-mono">
                     {t.active_entry} {currentIndex + 1}/{filteredFilms.length} // {currentFilm.date || t.not_available}
                   </label>
                   <h2 className="text-3xl lg:text-4xl font-serif leading-tight mb-2">{currentFilm.title}</h2>
                   <div className="flex gap-4 text-[10px] uppercase tracking-widest font-mono text-white/40">
                     <span>{t.author}: <span className="text-white/60">{currentFilm.author || t.not_available}</span></span>
                     <span>{t.place}: <span className="text-white/60">{currentFilm.place || t.not_available}</span></span>
                   </div>
                 </div>
                 <div className="flex gap-2 shrink-0">
                   <button
                      onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
                      disabled={currentIndex === 0}
                      className="text-white/40 hover:text-white disabled:opacity-30 transition-colors"
                    >
                      <ChevronLeft className="w-6 h-6" />
                    </button>
                    <button
                      onClick={() => setCurrentIndex(Math.min(filteredFilms.length - 1, currentIndex + 1))}
                      disabled={currentIndex === filteredFilms.length - 1}
                      className="text-white/40 hover:text-white disabled:opacity-30 transition-colors"
                    >
                      <ChevronRight className="w-6 h-6" />
                    </button>
                 </div>
              </div>

              <div className="mt-8 space-y-6">
                <MetadataField 
                  title={t.description} 
                  content={currentFilm.description || ""} 
                  approved={currentFilm.description_approved === 'true'}
                  placeholder={placeholders[`description_${lang}`] || placeholders['description'] || t.waiting}
                  strings={t}
                  onChange={(val) => handleUpdateCurrentFilm({ description: val })}
                  onToggleApprove={() => handleUpdateCurrentFilm({ description_approved: currentFilm.description_approved === 'true' ? 'false' : 'true' })}
                  onMention={() => handleMention(t.description)}
                />
                <MetadataField 
                  title={t.historic} 
                  content={currentFilm.historic_context || ""} 
                  approved={currentFilm.historic_context_approved === 'true'}
                  placeholder={placeholders[`historic_context_${lang}`] || placeholders['historic_context'] || t.waiting}
                  strings={t}
                  onChange={(val) => handleUpdateCurrentFilm({ historic_context: val })}
                  onToggleApprove={() => handleUpdateCurrentFilm({ historic_context_approved: currentFilm.historic_context_approved === 'true' ? 'false' : 'true' })}
                  onMention={() => handleMention(t.historic)}
                />
                <MetadataField 
                  title={t.aesthetic} 
                  content={currentFilm.aesthetic_critical_commentary || ""} 
                  approved={currentFilm.aesthetic_critical_commentary_approved === 'true'}
                  placeholder={placeholders[`aesthetic_critical_commentary_${lang}`] || placeholders['aesthetic_critical_commentary'] || t.waiting}
                  strings={t}
                  onChange={(val) => handleUpdateCurrentFilm({ aesthetic_critical_commentary: val })}
                  onToggleApprove={() => handleUpdateCurrentFilm({ aesthetic_critical_commentary_approved: currentFilm.aesthetic_critical_commentary_approved === 'true' ? 'false' : 'true' })}
                  onMention={() => handleMention(t.aesthetic)}
                />
                <MetadataField 
                  title={t.production} 
                  content={currentFilm.production_commentary || ""} 
                  approved={currentFilm.production_commentary_approved === 'true'}
                  placeholder={placeholders[`production_commentary_${lang}`] || placeholders['production_commentary'] || t.waiting}
                  strings={t}
                  optional={true}
                  onChange={(val) => handleUpdateCurrentFilm({ production_commentary: val })}
                  onToggleApprove={() => handleUpdateCurrentFilm({ production_commentary_approved: currentFilm.production_commentary_approved === 'true' ? 'false' : 'true' })}
                  onMention={() => handleMention(t.production)}
                />
                <MetadataField 
                  title={t.annotator_comments} 
                  content={currentFilm.annotator_comments_optional || ""} 
                  approved={currentFilm.annotator_comments_optional_approved === 'true'}
                  placeholder={placeholders[`annotator_comments_optional_${lang}`] || placeholders['annotator_comments_optional'] || t.waiting}
                  strings={t}
                  optional={true}
                  onChange={(val) => handleUpdateCurrentFilm({ annotator_comments_optional: val })}
                  onToggleApprove={() => handleUpdateCurrentFilm({ annotator_comments_optional_approved: currentFilm.annotator_comments_optional_approved === 'true' ? 'false' : 'true' })}
                  onMention={() => handleMention(t.annotator_comments)}
                />
                
                <div className="group">
                  <label className="text-[10px] uppercase tracking-widest text-white/30 block font-mono mb-2 flex justify-between items-end">
                    <span className="flex items-center">
                      {t.tags}
                      <button 
                        onClick={() => handleMention(t.tags)}
                        className="ml-2 text-white/20 hover:text-white transition-colors flex items-center justify-center p-1 rounded-sm"
                        title={`Mention ${t.tags} in chat`}
                      >
                         <AtSign className="w-3 h-3" />
                      </button>
                      <button 
                        onClick={() => handleUpdateCurrentFilm({ tags_approved: currentFilm.tags_approved === 'true' ? 'false' : 'true' })}
                        className={cn("ml-3 px-2 py-0.5 rounded-sm transition-colors border hidden md:inline-block text-[10px] uppercase tracking-widest font-mono", currentFilm.tags_approved === 'true' ? "border-emerald-500 bg-emerald-500/10 text-emerald-500" : "border-orange-500/50 text-orange-400 hover:text-orange-300 hover:border-orange-500 hover:bg-orange-500/10")}
                      >
                        {currentFilm.tags_approved === 'true' ? t.approved : t.approve_optional}
                      </button>
                    </span>
                     {(!currentFilm.tags || currentFilm.tags.trim() === '') ? (
                        <span className="text-amber-500/80">{t.pending}</span>
                    ) : currentFilm.tags_approved === 'true' ? (
                        <span className="text-emerald-500/80">● {t.approved}</span>
                    ) : (
                        <span className="text-blue-500/80">● {t.unapproved}</span>
                    )}
                  </label>
                  <button 
                    onClick={() => handleUpdateCurrentFilm({ tags_approved: currentFilm.tags_approved === 'true' ? 'false' : 'true' })}
                    className={cn("w-full md:hidden mb-2 text-left px-3 py-2 rounded-sm transition-colors border text-[10px] uppercase tracking-widest font-mono", currentFilm.tags_approved === 'true' ? "border-emerald-500 bg-emerald-500/10 text-emerald-500" : "border-orange-500/50 text-orange-400 hover:text-orange-300 hover:border-orange-500 hover:bg-orange-500/10")}
                  >
                    {currentFilm.tags_approved === 'true' ? t.approved : t.approve_optional}
                  </button>
                  <input 
                    type="text" 
                    value={currentFilm.tags || ""}
                    onChange={(e) => handleUpdateCurrentFilm({ tags: e.target.value })}
                    placeholder={placeholders[`tags_${lang}`] || placeholders['tags'] || t.type_observation}
                    className={cn(
                      "w-full bg-transparent border-b pb-3 text-sm focus:outline-none transition-colors font-mono",
                      currentFilm.tags_approved === 'true' ? "border-emerald-500/30 text-emerald-100/90" : "border-white/10 focus:border-white/40 text-white/90 placeholder:text-white/20"
                     )}
                  />
                  <div className="flex flex-wrap gap-2 mt-3">
                    {currentFilm.tags ? currentFilm.tags.split(',').map(t => t.trim()).filter(Boolean).map((tag, i) => (
                      <span key={i} className={cn("border px-2 py-1 text-[10px] uppercase tracking-wider font-mono", currentFilm.tags_approved === 'true' ? "border-emerald-500/20 text-emerald-300 bg-emerald-500/5" : "border-white/20 text-white/80 bg-white/5")}>
                        {tag}
                      </span>
                    )) : <span className="text-[10px] uppercase tracking-widest text-white/20 italic font-mono">{t.no_tags}</span>}
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Resizer Handle (Desktop only) */}
          <div 
            className={cn("hidden md:flex w-2 shrink-0 transition-colors z-20 group relative items-center justify-center", chatSidebarOpen ? "bg-black/20 hover:bg-[#1f1f1f] cursor-col-resize" : "pointer-events-none")}
            onMouseDown={(e) => {
              if (chatSidebarOpen && e.button === 0) {
                isDraggingChatRef.current = true;
                setIsDraggingChat(true);
                document.body.style.cursor = 'col-resize';
              }
            }}
          >
             {chatSidebarOpen && (
               <div className="flex flex-col gap-1 items-center justify-center opacity-30 group-hover:opacity-100 transition-opacity">
                 <div className="w-1 h-1 rounded-full bg-white" />
                 <div className="w-1 h-1 rounded-full bg-white" />
                 <div className="w-1 h-1 rounded-full bg-white" />
               </div>
             )}
             <div className="absolute inset-y-0 -left-2 -right-2 bg-transparent" />
          </div>

          {/* Right Pane: AI Chat */}
          <section 
            className={cn(
               "bg-[#121212] flex flex-col overflow-hidden min-h-0",
               !isDraggingChat && "transition-all duration-300",
               mobileTab === 'chat' ? "w-full flex-1 border-none" : "hidden md:flex md:h-full md:shrink-0",
               chatSidebarOpen ? "md:border-l border-white/5" : "md:w-0 md:border-l-0"
            )}
            style={{ width: window.innerWidth >= 768 ? (chatSidebarOpen ? chatWidth : 0) : undefined }}
          >
            <div className={cn("p-4 md:p-6 border-b border-white/5 flex items-center justify-between shadow-2xl z-10 shrink-0", !chatSidebarOpen && "opacity-0")}>
              <div className="flex items-center gap-3 min-w-max">
                <MessageSquare className="w-4 h-4 text-emerald-500/70" />
                <span className="text-[10px] uppercase tracking-widest text-emerald-500/70 font-bold whitespace-nowrap">{t.ai_assistant}</span>
              </div>
              <button 
                className="hidden md:block text-white/40 hover:text-white transition-colors shrink-0"
                onClick={() => setChatSidebarOpen(false)}
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 p-6 space-y-8 overflow-y-auto">
              {messages.map((m) => {
                const isUser = m.role === 'user';
                return (
                  <div key={m.id} className={cn("flex flex-col space-y-2", isUser ? "items-end" : "items-start")}>
                    <span className="text-[9px] uppercase tracking-widest text-white/20 font-bold">
                      {isUser ? t.annotator : t.ai_assistant}
                    </span>
                    <div className={cn(
                      "p-4 text-sm leading-relaxed max-w-[90%]",
                      isUser 
                        ? "bg-white text-black rounded-sm shadow-sm" 
                        : "bg-zinc-800/50 border-l-2 border-white rounded-sm text-white"
                    )}>
                      {m.content}
                    </div>
                  </div>
                )
              })}
              {loading && (
                <div className="flex flex-col space-y-2 items-start">
                    <span className="text-[9px] uppercase tracking-widest text-white/20 font-bold">{t.ai_assistant}</span>
                    <div className="bg-zinc-800/50 border-l-2 border-white p-4 rounded-sm flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-white/60 animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 bg-white/60 animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 bg-white/60 animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Chat Input */}
            <div className="p-6 lg:p-8 bg-black/40 border-t border-white/5 shrink-0">
              <form 
                onSubmit={(e) => { e.preventDefault(); handleSend(); }}
                className="relative flex items-center"
              >
                <input 
                  ref={chatInputRef}
                  type="text" 
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={t.type_observation}
                  className="w-full bg-transparent border-b border-white/20 py-4 pr-12 text-sm focus:outline-none focus:border-white transition-colors placeholder:text-white/20"
                />
                <button type="submit" disabled={!input.trim() || loading} className="absolute right-0 p-2 text-white/60 hover:text-white disabled:opacity-30 transition-colors">
                  <Send className="w-5 h-5" />
                </button>
              </form>
              <div className="mt-4 flex justify-between items-center">
                <span className="text-[9px] text-white/20 font-mono hidden sm:inline-block">{t.connected}</span>
                <div className="flex space-x-4 ml-auto sm:ml-0">
                  <button 
                    type="button"
                    onClick={() => {
                        if(currentIndex < filteredFilms.length - 1) {
                            setCurrentIndex(currentIndex + 1);
                        }
                    }}
                    className="text-[10px] uppercase tracking-widest text-white/40 hover:text-white transition-colors"
                  >
                    {t.skip}
                  </button>
                </div>
              </div>
            </div>
          </section>
        </main>
        
        {/* Footer */}
        <footer className="px-6 lg:px-10 py-3 bg-black text-[9px] uppercase tracking-[0.4em] text-white/20 flex justify-between border-t border-white/5 z-20 shrink-0">
          <span className="truncate mr-4">Annotation Module v2.4 // Shared Interface</span>
          <span className="flex-shrink-0">Session: #88219-X</span>
        </footer>
      </div>
    </div>
  );
}

function MetadataField({ 
  title, 
  content, 
  approved,
  placeholder,
  strings,
  optional,
  onChange,
  onToggleApprove,
  onMention
}: { 
  title: string, 
  content: string, 
  approved?: boolean,
  placeholder: string,
  strings: any,
  optional?: boolean,
  onChange: (val: string) => void,
  onToggleApprove: () => void,
  onMention?: () => void
}) {
  const isMissing = content.trim().length === 0;
  
  return (
    <div className="group">
      <label className="text-[10px] uppercase tracking-widest text-white/30 block font-mono mb-2 flex justify-between items-end">
        <span className="flex items-center">
          {title}
          {onMention && (
             <button 
                onClick={onMention}
                className="ml-2 text-white/20 hover:text-white transition-colors flex items-center justify-center p-1 rounded-sm"
                title={`Mention ${title} in chat`}
             >
                <AtSign className="w-3 h-3" />
             </button>
          )}
          {(!isMissing || optional) && (
            <button 
              onClick={onToggleApprove}
              className={cn("ml-3 px-2 py-0.5 rounded-sm transition-colors border hidden md:inline-block text-[10px] uppercase tracking-widest font-mono", approved ? "border-emerald-500 bg-emerald-500/10 text-emerald-500" : "border-[#f0b100]/50 text-[#f0b100] hover:text-[#f0b100]/80 hover:border-[#f0b100] hover:bg-[#f0b100]/10")}
            >
              {approved ? strings.approved : (optional ? strings.approve_optional : strings.approve)}
            </button>
          )}
        </span>
        {isMissing ? (
            <span className="text-amber-500/80">{strings.pending}</span>
        ) : approved ? (
            <span className="text-emerald-500/80">● {strings.approved}</span>
        ) : (
            <span className="text-blue-500/80">● {strings.unapproved}</span>
        )}
      </label>
      
      {(!isMissing || optional) && (
         <button 
          onClick={onToggleApprove}
          className={cn("w-full md:hidden mb-2 text-left px-3 py-2 rounded-sm transition-colors border text-[10px] uppercase tracking-widest font-mono", approved ? "border-emerald-500 bg-emerald-500/10 text-emerald-500" : "border-[#f0b100]/50 text-[#f0b100] hover:text-[#f0b100]/80 hover:border-[#f0b100] hover:bg-[#f0b100]/10")}
        >
          {approved ? strings.approved : (optional ? strings.approve_optional : strings.approve)}
        </button>
      )}

      <textarea 
         value={content}
         onChange={(e) => onChange(e.target.value)}
         placeholder={placeholder}
         rows={isMissing ? 2 : Math.max(3, content.split('\n').length)}
         className={cn(
          "w-full bg-transparent border-b pb-3 text-sm/relaxed resize-none focus:outline-none transition-colors",
          approved ? "border-white/30 text-emerald-100/90" : "border-white/30 focus:border-white/50 text-white/90",
          isMissing && "italic text-zinc-500"
         )}
      />
    </div>
  );
}

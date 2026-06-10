import React, { useState, useEffect, useRef, useMemo } from "react";
import Papa from "papaparse";
import JSZip from "jszip";
import { Film, Message } from "./types";
import { v4 as uuidv4 } from "uuid";
import { Send, ChevronLeft, ChevronRight, Play, MessageSquare, Menu, Globe, Upload, FileText, AtSign, MonitorSmartphone, X, Download, Archive, User, ChevronDown, ChevronUp, MoreHorizontal, Save, Check } from "lucide-react";
import { cn } from "./lib/utils";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import TextareaAutosize from 'react-textarea-autosize';

const TRANSLATIONS = {
  en: {
    title: "Title",
    not_available: "Not Available",
    queue: "Film Queue",
    studio: "Annotation Studio",
    completion: "Completion",
    sync: "Download CSV",
    upload_csv: "Upload CSV",
    export_report: "Export Deliverable",
    save_cache: "Save & Backup",
    saved: "Saved!",
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
    pending: "Needs Input",
    drafting: "Drafting",
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
    in_progress: "Drafting",
    ready_for_review: "Ready for Review",
    almost_there: "Almost There",
    done: "Done",
    unapproved: "Ready for Review"
  },
  es: {
    title: "Título",
    not_available: "No Disponible",
    queue: "Cola de Películas",
    studio: "Estudio de Anotación",
    completion: "Completado",
    sync: "Descargar CSV",
    upload_csv: "Subir CSV",
    export_report: "Exportar Entregable",
    save_cache: "Guardar",
    saved: "¡Guardado!",
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
    pending: "Falta Información",
    drafting: "Borrador",
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
    in_progress: "Borrador",
    ready_for_review: "Listo para Revisión",
    almost_there: "Casi Listo",
    done: "Completado",
    unapproved: "Listo para Revisión"
  }
};

export default function App() {
  const [films, setFilms] = useState<Film[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 1024);
  const [lang, setLang] = useState<'en' | 'es'>('es');
  const [reportLoading, setReportLoading] = useState(false);
  const [showSavedFeedback, setShowSavedFeedback] = useState(false);
  const [assigneeFilter, setAssigneeFilter] = useState('');
  const [mobileTab, setMobileTab] = useState<'metadata' | 'chat'>('metadata');
  const [chatSidebarOpen, setChatSidebarOpen] = useState(true);
  const [actionMenuOpen, setActionMenuOpen] = useState(false);
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
          const savedStr = localStorage.getItem('annotator_edits');
          const existingEdits: Record<string, Partial<Film>> = savedStr ? JSON.parse(savedStr) : {};
          const newEditsToSave: Record<string, Partial<Film>> = { ...existingEdits };
          
          const editableFields = [
            'description', 'historic_context', 'aesthetic_critical_commentary', 
            'production_commentary', 'tags', 'annotator_comments_optional',
            'description_approved', 'historic_context_approved', 
            'aesthetic_critical_commentary_approved', 'production_commentary_approved', 
            'tags_approved', 'annotator_comments_optional_approved'
          ] as const;

          const mergedFilms = validFilms.map(f => {
            const currentEdit = existingEdits[f.slug] || {};
            const finalEdit: Partial<Film> = { ...currentEdit };
            const mergedFilm = { ...f };
            
            editableFields.forEach(field => {
              if (currentEdit[field as keyof Film]) {
                // Preserve existing local edits
                (mergedFilm as any)[field] = currentEdit[field as keyof Film];
              } else if (f[field as keyof Film]) {
                // Adopt incoming CSV edit if local is empty
                (finalEdit as any)[field] = f[field as keyof Film];
              }
            });
            
            if (Object.keys(finalEdit).length > 0) {
              newEditsToSave[f.slug] = finalEdit;
            }
            return mergedFilm;
          });

          setFilms(mergedFilms);
          localStorage.setItem('annotator_edits', JSON.stringify(newEditsToSave));
          
          if(e.target) e.target.value = ''; // Reset input
        }
      }
    });
  };

  const handleManualSave = () => {
    if (films.length === 0) return;
    
    // The auto-save already writes to localStorage, but we'll run it explicitly here just in case.
    const editsToSave: Record<string, Partial<Film>> = {};
    films.forEach(f => {
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

    setShowSavedFeedback(true);
    setTimeout(() => {
      setShowSavedFeedback(false);
    }, 2000);
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
    const requiredFields = [f.description, f.historic_context, f.aesthetic_critical_commentary];
    const requiredApprovedFields = [f.description_approved, f.historic_context_approved, f.aesthetic_critical_commentary_approved];
    const filled = requiredFields.filter(val => val && val.trim().split(/\s+/).filter(Boolean).length >= 20).length;
    const approvedCount = requiredApprovedFields.filter(val => val === 'true').length;
    return filled === 3 && approvedCount === 3;
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
            const requiredFields = [film.description, film.historic_context, film.aesthetic_critical_commentary];
            const requiredApprovedFields = [film.description_approved, film.historic_context_approved, film.aesthetic_critical_commentary_approved];
            const filled = requiredFields.filter(f => f && f.trim().split(/\s+/).filter(Boolean).length >= 20).length;
            const approvedCount = requiredApprovedFields.filter(f => f === 'true').length;
            
            const progress = (filled / requiredFields.length) * 100;

            let bgColor = 'bg-amber-600';
            let textColor = 'text-amber-500';
            let statusText = t.not_started;
            let barWidth = progress || 2; // Keep a sliver if empty

            if (filled === 3 && approvedCount === 3) {
              bgColor = 'bg-emerald-500';
              textColor = 'text-emerald-400';
              statusText = t.approved;
              barWidth = 100;
            } else if (filled === 3 && approvedCount < 3) {
              bgColor = 'bg-blue-500';
              textColor = 'text-blue-400';
              statusText = t.ready_for_review;
              barWidth = 100;
            } else if (filled > 0 && filled < 3) {
              bgColor = 'bg-yellow-500';
              textColor = 'text-yellow-500';
              statusText = t.in_progress;
            } else {
              bgColor = 'bg-amber-600';
              textColor = 'text-amber-500';
              statusText = t.not_started;
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
        <header className="relative z-50 flex justify-between items-center px-2 md:px-6 lg:px-10 py-3 md:py-5 lg:py-6 border-b border-white/10 flex-shrink-0 flex-nowrap gap-2">
          <div className="flex flex-col shrink-0">
            <div className="flex items-center gap-1 md:gap-3">
              {!sidebarOpen && (
                <button onClick={() => setSidebarOpen(true)} className="text-white/60 hover:text-white transition-colors">
                  <Menu className="w-4 h-4 md:w-5 md:h-5" />
                </button>
              )}
              <span className="text-xs md:text-xl uppercase tracking-[0.2em] font-mono font-bold text-[#f0b100] whitespace-nowrap">MediaFile_it</span>
            </div>
          </div>
          <div className="flex flex-nowrap items-center gap-2 md:gap-6 shrink-0 justify-end border-l border-white/10 pl-2 md:pl-0 md:border-none">
            <div className="flex items-center gap-1 md:gap-3 border border-[#f0b100]/20 rounded-md p-1 md:p-1.5 bg-[#f0b100]/5 shrink-0">
               <div className="relative flex items-center group">
                 <User className="w-3 h-3 md:w-3.5 md:h-3.5 text-[#f0b100] ml-1 md:ml-1.5 opacity-70 group-hover:opacity-100 transition-opacity pointer-events-none shrink-0" />
                 <select 
                    value={assigneeFilter}
                    onChange={(e) => {
                      setAssigneeFilter(e.target.value);
                      setCurrentIndex(0);
                    }}
                    className="bg-transparent border-none text-[8px] md:text-[10px] uppercase tracking-widest text-[#f0b100] appearance-none cursor-pointer hover:text-[#f0b100]/80 focus:outline-none pl-1 pr-4 py-0.5 font-mono max-w-[60px] md:max-w-[120px] text-ellipsis"
                    title={t.filter_by}
                 >
                    <option value="" className="bg-[#0F0F0F]">{t.filter_all}</option>
                    {uniqueAssignees.map(a => (
                      <option key={a} value={a} className="bg-[#0F0F0F]">{a}</option>
                    ))}
                 </select>
                 <ChevronDown className="w-3 h-3 text-[#f0b100]/50 absolute right-0 pointer-events-none" />
               </div>

               <div className="h-3 md:h-4 w-px bg-[#f0b100]/30 shrink-0"></div>

               <div className="flex items-baseline gap-0.5 md:gap-1 pl-0.5 pr-1 md:pr-2 shrink-0">
                 <span className="text-[10px] md:text-sm font-mono font-bold text-[#f0b100] leading-none">
                   {completedCount}<span className="text-[#f0b100]/50 text-[8px] md:text-[10px]">/{filteredFilms.length}</span>
                 </span>
               </div>
            </div>
            
            {/* Desktop Actions */}
            <div className="hidden lg:flex items-center gap-2 shrink-0">
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

            {/* Desktop Export Actions */}
            <div className="hidden lg:flex items-center gap-2 shrink-0">
              <button 
                onClick={handleManualSave}
                className={cn(
                  "flex items-center justify-center border rounded-sm text-white p-1.5 md:p-2 lg:px-4 lg:py-2 text-[10px] lg:text-xs uppercase tracking-widest font-bold transition-all duration-300",
                  showSavedFeedback ? "border-emerald-500 bg-emerald-500/20 text-emerald-400" : "border-white/20 hover:bg-white/10"
                )}
                title={t.save_cache}
              >
                <span className="flex items-center">
                  {showSavedFeedback ? <Check className="w-3 h-3 md:w-4 md:h-4 lg:mr-2" /> : <Save className="w-3 h-3 md:w-4 md:h-4 lg:mr-2" />}
                  <span className="hidden lg:inline">{showSavedFeedback ? t.saved : t.save_cache}</span>
                </span>
              </button>
              <button 
                onClick={exportDeliverables}
                disabled={reportLoading}
                className="flex items-center justify-center border border-white/20 rounded-sm text-white p-1.5 md:p-2 lg:px-4 lg:py-2 text-[10px] lg:text-xs uppercase tracking-widest font-bold hover:bg-white/10 transition-colors disabled:opacity-50"
                title={t.export_report}
              >
                {reportLoading ? (
                  <span className="animate-pulse">...</span>
                ) : (
                   <span className="flex items-center">
                     <Archive className="w-3 h-3 md:w-4 md:h-4 lg:mr-2" />
                     <span className="hidden lg:inline">{t.export_report}</span>
                   </span>
                )}
              </button>
              <button 
                onClick={exportCSV}
                title={t.sync}
                className="p-1.5 md:p-2 border border-white/20 text-white/60 hover:text-white hover:border-white/50 transition-colors flex items-center justify-center rounded-sm shrink-0"
              >
                <Download className="w-3 h-3 md:w-4 md:h-4" />
              </button>
              
              {!chatSidebarOpen && (
                 <button 
                   onClick={() => setChatSidebarOpen(true)}
                   className="hidden lg:flex ml-2 lg:ml-4 text-white/40 hover:text-white transition-colors shrink-0 items-center justify-center"
                   title="Open AI Chat"
                 >
                   <ChevronLeft className="w-5 h-5" />
                 </button>
              )}
            </div>

            {/* Mobile Actions Menu */}
            <div className="lg:hidden relative shrink-0">
              <button 
                onClick={() => setActionMenuOpen(!actionMenuOpen)}
                className="p-1.5 md:p-2 border border-white/20 text-white/60 hover:text-white hover:border-white/50 transition-colors flex items-center justify-center rounded-sm"
              >
                <MoreHorizontal className="w-3 h-3 md:w-4 md:h-4" />
              </button>
              
              {actionMenuOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setActionMenuOpen(false)}
                  />
                  <div className="absolute right-0 top-full mt-2 w-48 bg-[#1f1f1f] border border-white/10 rounded-sm shadow-xl z-50 flex flex-col overflow-hidden">
                    <button 
                      onClick={() => { setLang(lang === 'en' ? 'es' : 'en'); setActionMenuOpen(false); }}
                      className="px-4 py-3 text-[10px] text-white/70 hover:bg-white/5 hover:text-white flex items-center gap-3 transition-colors text-left font-mono uppercase tracking-widest w-full"
                    >
                      <Globe className="w-3.5 h-3.5" /> Toggle Lang
                    </button>
                    <button 
                      onClick={() => { handleManualSave(); setActionMenuOpen(false); }}
                      className={cn(
                        "px-4 py-3 text-[10px] flex items-center gap-3 transition-colors text-left font-mono uppercase tracking-widest w-full border-b border-white/5",
                        showSavedFeedback ? "text-emerald-400 bg-emerald-500/10" : "text-white/70 hover:bg-white/5 hover:text-white"
                      )}
                    >
                      {showSavedFeedback ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />} {showSavedFeedback ? t.saved : t.save_cache}
                    </button>
                    <label 
                      className="px-4 py-3 text-[10px] text-white/70 hover:bg-white/5 hover:text-white flex items-center gap-3 transition-colors text-left cursor-pointer font-mono uppercase tracking-widest w-full"
                    >
                      <Upload className="w-3.5 h-3.5" /> {t.upload_csv}
                      <input type="file" accept=".csv" className="hidden" onChange={(e) => { handleUploadCSV(e); setActionMenuOpen(false); }} />
                    </label>
                    <button 
                      onClick={() => { exportDeliverables(); setActionMenuOpen(false); }}
                      disabled={reportLoading}
                      className="px-4 py-3 text-[10px] text-white/70 hover:bg-white/5 hover:text-white flex items-center gap-3 transition-colors text-left border-y border-white/5 font-mono uppercase tracking-widest w-full"
                    >
                      <Archive className="w-3.5 h-3.5" /> {t.export_report}
                    </button>
                    <button 
                      onClick={() => { exportCSV(); setActionMenuOpen(false); }}
                      className="px-4 py-3 text-[10px] text-white/70 hover:bg-white/5 hover:text-white flex items-center gap-3 transition-colors text-left font-mono uppercase tracking-widest w-full"
                    >
                      <Download className="w-3.5 h-3.5" /> {t.sync}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Main Workspace */}
        <main className="flex-1 flex flex-col lg:flex-row overflow-hidden bg-[#0F0F0F] relative">
          
          {/* Left Pane: Video & Metadata */}
          <section className={cn(
            "w-full flex flex-col border-b lg:border-b-0 lg:border-r border-white/10 shrink-0 lg:shrink lg:flex-1 min-h-0",
            mobileTab === 'metadata' ? "flex-1 overflow-hidden" : "shrink-0"
          )}>
            <div className="pt-[20px] px-[20px] pb-[10px] md:pt-[30px] md:px-[30px] md:pb-[15px] shrink-0 border-b border-white/5 lg:border-none flex justify-center">
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
            <div className="lg:hidden flex border-b border-white/10 shrink-0 bg-black">
               <button 
                  onClick={() => setMobileTab('metadata')}
                  className={cn(
                    "flex-1 py-1.5 text-[10px] md:text-xs uppercase tracking-widest transition-colors flex items-center justify-center gap-2", 
                    mobileTab === 'metadata' ? "text-white border-b-2 border-white bg-white/5 font-bold" : "text-white/40 font-medium"
                  )}
               >
                 <FileText className="w-3.5 h-3.5 md:w-4 md:h-4" /> Form
               </button>
               <button 
                  onClick={() => setMobileTab('chat')}
                  className={cn(
                    "flex-1 py-1.5 text-[10px] md:text-xs uppercase tracking-widest transition-colors flex items-center justify-center gap-2", 
                    mobileTab === 'chat' ? "text-emerald-400 border-b-2 border-emerald-500 bg-emerald-500/10 font-bold" : "text-emerald-500/50 font-medium"
                  )}
               >
                 <MessageSquare className="w-3.5 h-3.5 md:w-4 md:h-4" /> AI Chat
               </button>
            </div>

            <div className={cn(
              "flex-1 overflow-y-auto px-4 md:px-6 lg:px-8 py-4 md:py-6 lg:py-8",
              mobileTab === 'chat' && "hidden lg:block" // Hide metadata on mobile if chat is active
            )}>
              <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-2">
                 <span className="text-[10px] uppercase tracking-widest text-white/40 font-mono">
                   {currentIndex + 1} / {filteredFilms.length}
                 </span>
                 <div className="flex gap-2">
                   <button
                      onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
                      disabled={currentIndex === 0}
                      className="text-white/40 hover:text-white disabled:opacity-30 transition-colors"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => setCurrentIndex(Math.min(filteredFilms.length - 1, currentIndex + 1))}
                      disabled={currentIndex === filteredFilms.length - 1}
                      className="text-white/40 hover:text-white disabled:opacity-30 transition-colors"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                 </div>
              </div>

              <div className="mb-6">
                 <h2 className="font-serif leading-tight mb-2 flex items-start sm:items-center gap-2">
                   <button 
                      onClick={() => handleMention(t.title)}
                      className="text-white/30 hover:text-white transition-colors shrink-0 mt-1 sm:mt-0"
                      title={`Mention ${t.title} in chat`}
                    >
                       <AtSign className="w-4 h-4 md:w-5 md:h-5" />
                   </button>
                   <span className="text-xl md:text-3xl text-white/90">{currentFilm.title}</span>
                 </h2>
                 <div className="flex flex-wrap gap-x-5 gap-y-1 text-[9px] uppercase tracking-widest font-mono text-white/40">
                   <span className="flex items-center gap-1">
                      <button 
                         onClick={() => handleMention(t.date)}
                         className="text-white/40 hover:text-white transition-colors flex items-center gap-1"
                         title={`Mention ${t.date} in chat`}
                      >
                         <AtSign className="w-3 h-3" />
                         <span>{t.date}</span>
                      </button>
                      <span>: <span className="text-white/60">{currentFilm.date || t.not_available}</span></span>
                   </span>
                   <span className="flex items-center gap-1">
                      <button 
                         onClick={() => handleMention(t.place)}
                         className="text-white/40 hover:text-white transition-colors flex items-center gap-1"
                         title={`Mention ${t.place} in chat`}
                      >
                         <AtSign className="w-3 h-3" />
                         <span>{t.place}</span>
                      </button>
                      <span>: <span className="text-white/60">{currentFilm.place || t.not_available}</span></span>
                   </span>
                   <span className="flex items-center gap-1">
                      <button 
                         onClick={() => handleMention(t.author)}
                         className="text-white/40 hover:text-white transition-colors flex items-center gap-1"
                         title={`Mention ${t.author} in chat`}
                      >
                         <AtSign className="w-3 h-3" />
                         <span>{t.author}</span>
                      </button>
                      <span>: <span className="text-white/60">{currentFilm.author || t.not_available}</span></span>
                   </span>
                 </div>
              </div>

              <div className="mt-4 space-y-4">
                <MetadataField 
                  title={t.description} 
                  content={currentFilm.description || ""} 
                  approved={currentFilm.description_approved === 'true'}
                  placeholder={placeholders[`description_${lang}`] || placeholders['description'] || t.waiting}
                  strings={t}
                  minWords={20}
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
                  minWords={20}
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
                  minWords={20}
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
                  <label className="text-[10px] uppercase tracking-widest text-white/30 font-mono mb-2 flex flex-wrap justify-between items-end gap-x-2 gap-y-1">
                    <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="flex items-center gap-1">
                        <button 
                          onClick={() => handleMention(t.tags)}
                          className="text-white/60 hover:text-white transition-colors flex items-center gap-1 rounded-sm uppercase tracking-widest font-mono"
                          title={`Mention ${t.tags} in chat`}
                        >
                           <AtSign className="w-3.5 h-3.5" />
                           <span>{t.tags}</span>
                        </button>
                      </span>
                      <button 
                        onClick={() => handleUpdateCurrentFilm({ tags_approved: currentFilm.tags_approved === 'true' ? 'false' : 'true' })}
                        className={cn("px-2 py-0.5 rounded-sm transition-colors border hidden md:flex items-center gap-1 text-[10px] uppercase tracking-widest font-mono", currentFilm.tags_approved === 'true' ? "border-emerald-500 bg-emerald-500/10 text-emerald-500" : "border-white/20 text-white/50 hover:text-white hover:border-white/40 hover:bg-white/5")}
                      >
                        <Check className="w-3 h-3" />
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
                    className={cn("w-full md:hidden mb-2 text-left px-3 py-2 rounded-sm transition-colors border flex items-center gap-2 text-[10px] uppercase tracking-widest font-mono", currentFilm.tags_approved === 'true' ? "border-emerald-500 bg-emerald-500/10 text-emerald-500" : "border-white/20 text-white/50 hover:text-white hover:border-white/40 hover:bg-white/5")}
                  >
                    <Check className="w-4 h-4" />
                    {currentFilm.tags_approved === 'true' ? t.approved : t.approve_optional}
                  </button>
                  <input 
                    type="text" 
                    value={currentFilm.tags || ""}
                    onChange={(e) => handleUpdateCurrentFilm({ tags: e.target.value })}
                    placeholder={placeholders[`tags_${lang}`] || placeholders['tags'] || t.type_observation}
                    className={cn(
                      "w-full bg-transparent border-b pb-2 text-[13px] focus:outline-none transition-colors font-mono text-white placeholder:text-white/20",
                      currentFilm.tags_approved === 'true' ? "border-white/30" : "border-white/10 focus:border-white/40"
                     )}
                  />
                  <div className="flex flex-wrap gap-2 mt-3">
                    {currentFilm.tags ? currentFilm.tags.split(',').map(t => t.trim()).filter(Boolean).map((tag, i) => (
                      <span key={i} className={cn("border px-2 py-1 text-[10px] uppercase tracking-wider font-mono", currentFilm.tags_approved === 'true' ? "border-white/30 text-white bg-white/10" : "border-white/20 text-white/80 bg-white/5")}>
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
            className={cn("hidden lg:flex w-2 shrink-0 transition-colors z-20 group relative items-center justify-center", chatSidebarOpen ? "bg-black/20 hover:bg-[#1f1f1f] cursor-col-resize" : "pointer-events-none")}
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
               mobileTab === 'chat' ? "w-full flex-1 border-none" : "hidden lg:flex lg:h-full lg:shrink-0",
               chatSidebarOpen ? "lg:border-l border-white/5" : "lg:w-0 lg:border-l-0"
            )}
            style={{ width: window.innerWidth >= 1024 ? (chatSidebarOpen ? chatWidth : 0) : undefined }}
          >
            <button 
              className={cn("absolute right-4 top-4 z-20 hidden lg:block text-white/40 hover:text-white transition-colors bg-[#121212] p-1 rounded-sm shadow-xl", !chatSidebarOpen && "hidden")}
              onClick={() => setChatSidebarOpen(false)}
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            <div className="flex-1 p-4 md:p-6 md:pt-10 space-y-6 md:space-y-8 overflow-y-auto relative">
              {messages.map((m) => {
                const isUser = m.role === 'user';
                return (
                  <div key={m.id} className={cn("flex flex-col space-y-2", isUser ? "items-end" : "items-start")}>
                    <span className={cn("text-[9px] uppercase tracking-widest font-bold", isUser ? "text-white/20" : "text-emerald-500/70")}>
                      {isUser ? t.annotator : t.ai_assistant}
                    </span>
                    <div className={cn(
                      "p-3 md:p-4 text-sm leading-relaxed max-w-[90%]",
                      isUser 
                        ? "bg-white text-black rounded-sm shadow-sm" 
                        : "bg-zinc-800/50 border-l-2 border-white rounded-sm text-white"
                    )}>
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          a: ({node, ...props}) => <a {...props} className="text-blue-400 hover:text-blue-300 underline underline-offset-2 break-all" target="_blank" rel="noopener noreferrer" />,
                          p: ({node, ...props}) => <p {...props} className="mb-2 last:mb-0" />,
                          pre: ({node, children, ...props}: any) => {
                            const codeElement = Array.isArray(children) ? children[0] : children;
                            const content = codeElement?.props?.children || '';
                            return (
                              <div className="relative mt-2 mb-4 group pre-wrapper">
                                <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button
                                    onClick={() => navigator.clipboard.writeText(String(content).replace(/\n$/, ''))}
                                    className="bg-zinc-700 hover:bg-zinc-600 px-2 py-1 rounded text-xs text-white/90 shadow-sm flex items-center gap-1 transition-colors"
                                  >
                                    Copy
                                  </button>
                                </div>
                                <pre className="bg-black/60 p-4 rounded whitespace-pre-wrap break-words text-[13px] font-mono border border-white/10 text-white/90" {...props}>
                                  {children}
                                </pre>
                              </div>
                            );
                          },
                          code: ({className, children, node, ...props}: any) => {
                            const isBlock = /language-(\w+)/.exec(className || '') || String(children).includes('\n');
                            if (isBlock) {
                              return <code className={className} {...props}>{children}</code>;
                            }
                            return (
                              <code className="bg-white/10 px-1 py-0.5 rounded text-[13px] font-mono text-emerald-400" {...props}>
                                {children}
                              </code>
                            )
                          }
                        }}
                      >
                        {m.content}
                      </ReactMarkdown>
                    </div>
                  </div>
                )
              })}
              {loading && (
                <div className="flex flex-col space-y-2 items-start">
                    <span className="text-[9px] uppercase tracking-widest text-emerald-500/70 font-bold">{t.ai_assistant}</span>
                    <div className="bg-zinc-800/50 border-l-2 border-white p-3 md:p-4 rounded-sm flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-white/60 animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 bg-white/60 animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 bg-white/60 animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Chat Input */}
            <div className="p-4 md:p-6 bg-black/40 border-t border-white/5 shrink-0">
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
                  className="w-full bg-transparent border-b border-white/20 py-3 pr-10 text-sm md:text-base focus:outline-none focus:border-white transition-colors placeholder:text-white/20"
                />
                <button type="submit" disabled={!input.trim() || loading} className="absolute right-0 p-2 text-white/60 hover:text-white disabled:opacity-30 transition-colors">
                  <Send className="w-4 h-4 md:w-5 md:h-5" />
                </button>
              </form>
            </div>
          </section>
        </main>
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
  minWords,
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
  minWords?: number,
  onChange: (val: string) => void,
  onToggleApprove: () => void,
  onMention?: () => void
}) {
  const hasText = content.trim().length > 0;
  const wordCount = hasText ? content.trim().split(/\s+/).length : 0;
  const requirementMet = optional ? true : (minWords ? wordCount >= minWords : hasText);
  const isMissing = !hasText;
  
  const [isExpanded, setIsExpanded] = useState(!approved || !requirementMet);

  return (
    <div className="group bg-zinc-900/30 border border-white/5 rounded-md overflow-hidden transition-all duration-300">
      <div 
         className="px-3 py-3 md:px-4 md:py-3 flex flex-wrap justify-between items-center gap-x-4 gap-y-2 cursor-pointer hover:bg-white/5 transition-colors select-none"
         onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="text-[10px] uppercase tracking-widest text-white/30 font-mono flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="flex items-center gap-1">
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5 opacity-60" /> : <ChevronDown className="w-3.5 h-3.5 opacity-60" />}
            {onMention ? (
               <button 
                  onClick={(e) => { e.stopPropagation(); onMention(); }}
                  className="text-white hover:text-white transition-colors flex items-center gap-1 rounded-sm uppercase tracking-widest font-mono"
                  title={`Mention ${title} in chat`}
               >
                  <AtSign className="w-3.5 h-3.5" />
                  <span>{title}</span>
               </button>
            ) : (
                <span>{title}</span>
            )}
          </span>
          {minWords && !optional && (
            <span className={cn("text-[9px]", wordCount >= minWords ? "text-emerald-500/50" : "text-amber-500/50")}>
              ({wordCount}/{minWords} words)
            </span>
          )}
          {requirementMet && (
            <button 
              onClick={(e) => { e.stopPropagation(); onToggleApprove(); }}
              className={cn("px-2 py-0.5 rounded-sm transition-colors border flex items-center gap-1 text-[10px] uppercase tracking-widest font-mono", approved ? "border-emerald-500 bg-emerald-500/10 text-emerald-500" : "border-white/20 text-white/50 hover:text-white hover:border-white/40 hover:bg-white/5")}
            >
              <Check className="w-3 h-3" />
              {approved ? strings.approved : (optional ? strings.approve_optional : strings.approve)}
            </button>
          )}
        </div>
        
        <div className="text-[10px] uppercase tracking-widest font-mono shrink-0">
            {isMissing ? (
                <span className="text-amber-500/80">{strings.pending}</span>
            ) : !requirementMet ? (
                <span className="text-amber-500/80">{minWords ? `${strings.drafting} (< ${minWords} words)` : strings.drafting}</span>
            ) : approved ? (
                <span className="text-emerald-500/80">● {strings.approved}</span>
            ) : (
                <span className="text-blue-500/80">● {strings.unapproved}</span>
            )}
        </div>
      </div>
      
      {isExpanded && (
        <div className="px-3 pb-3 md:px-4 md:pb-4 pt-1 border-t border-white/5">
          <TextareaAutosize 
             value={content}
             onChange={(e) => onChange(e.target.value)}
             placeholder={placeholder}
             minRows={5}
             className={cn(
              "w-full bg-transparent text-[13px] leading-relaxed resize-none focus:outline-none transition-colors text-white",
              isMissing && "italic text-zinc-500"
             )}
          />
        </div>
      )}
    </div>
  );
}

import express from "express";
import fs from "fs";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import * as dotenv from 'dotenv';
dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// DRY Helper function to read configuration from AI_CONFIGURATION.md
function getConfigValue(key: string, parseAsArray = false, envFallback?: string) {
  let value = envFallback;
  try {
    const configText = fs.readFileSync(path.join(process.cwd(), 'AI_CONFIGURATION.md'), 'utf-8');
    const regex = new RegExp(`\\*\\*${key}:\\*\\*\\s*\`?([^\`\n]+)\`?`);
    const match = configText.match(regex);
    if (match && match[1]) {
      value = match[1].replace(/`/g, '').trim();
    }
  } catch(e) {}
  
  if (value && parseAsArray) {
    return value.split(",").map(s => s.trim().toLowerCase());
  }
  return value;
}

// Configuration Accessors
const getAiPriority = () => getConfigValue('PRIORITY', true, "openrouter,gemini,anthropic,mistral") as string[];
const getSearchPriority = () => getConfigValue('SEARCH_PRIORITY', true, "tavily,perplexity,brave") as string[];
const getPrimaryModel = () => getConfigValue('MODEL', false, process.env.OPENROUTER_MODEL || "openai/gpt-4o-mini") as string;
const getPerplexityModel = () => getConfigValue('PERPLEXITY_MODEL', false, process.env.PERPLEXITY_MODEL || "llama-3.1-sonar-large-128k-online") as string;

async function performWebSearch(query: string): Promise<string> {
    const providers = getSearchPriority();
    let searchResult = "No search API configured. Please set TAVILY_API_KEY, PERPLEXITY_API_KEY, or BRAVE_API_KEY in .env. Falling back to Wikipedia.";

    for (const provider of providers) {
        if (provider.includes("tavily") && process.env.TAVILY_API_KEY) {
             try {
                 const res = await fetch("https://api.tavily.com/search", {
                     method: "POST", headers: { "Content-Type": "application/json" },
                     body: JSON.stringify({ api_key: process.env.TAVILY_API_KEY, query, include_answer: true, max_results: 5 })
                 });
                 const data = await res.json();
                 if (data.answer || data.results?.length > 0) return data.answer || JSON.stringify(data.results?.map((r:any) => ({title: r.title, content: r.content})));
             } catch(e:any) {
                 console.error("Tavily search failed", e);
             }
        }
        else if (provider.includes("perplexity") && process.env.PERPLEXITY_API_KEY) {
             try {
                 const openai = new OpenAI({ baseURL: "https://api.perplexity.ai", apiKey: process.env.PERPLEXITY_API_KEY });
                 const model = getPerplexityModel();
                 const response = await openai.chat.completions.create({
                     model: model,
                     messages: [{ role: "system", content: "You are a web search assistant. Provide a highly detailed and concise factual summary of the search query based on current online information, focusing on historical and cultural context if relevant." }, { role: "user", content: query }]
                 });
                 if (response.choices && response.choices.length > 0) return response.choices[0].message.content || "No results";
             } catch (e: any) {
                 console.error("Perplexity search failed", e);
             }
        }
        else if (provider.includes("brave") && process.env.BRAVE_API_KEY) {
             try {
                 const res = await fetch(`https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}`, {
                     headers: { "Accept": "application/json", "X-Subscription-Token": process.env.BRAVE_API_KEY }
                 });
                 const data = await res.json();
                 if (data.web?.results?.length > 0) return JSON.stringify(data.web?.results?.map((r:any) => ({title: r.title, description: r.description}))?.slice(0, 5));
             } catch(e:any) {
                 console.error("Brave search failed", e);
             }
        }
    }

    try {
        console.log("Falling back to Wikipedia search for:", query);
        const lang = query.match(/[áéíóú¿¡ñ]/i) ? "es" : "en"; // Simple heuristic
        const url = `https://${lang}.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&utf8=&format=json&srlimit=3`;
        const res = await fetch(url);
        const data = await res.json();
        
        if (data.query?.search?.length > 0) {
            const summaries = await Promise.all(data.query.search.map(async (r: any) => {
                const detailUrl = `https://${lang}.wikipedia.org/w/api.php?action=query&prop=extracts&exintro=&explaintext=&titles=${encodeURIComponent(r.title)}&format=json`;
                const details = await fetch(detailUrl).then(response => response.json());
                const pages = details.query.pages;
                const extract = Object.values(pages)[0] as any;
                return `Title: ${r.title}\nSummary: ${extract?.extract || r.snippet.replace(/<[^>]+>/g, '')}`;
            }));
            return "From Wikipedia:\n" + summaries.join('\n\n');
        }
    } catch(e) {
        console.error("Wikipedia fallback failed", e);
    }
    
    return searchResult;
}

// Routes
app.get("/api/guidelines", (req, res) => {
  try {
    const guidelines = fs.readFileSync(path.join(process.cwd(), 'ANNOTATION_GUIDELINES.md'), 'utf-8');
    return res.send(guidelines);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.get("/api/placeholders", (req, res) => {
  try {
    const placeholders = fs.readFileSync(path.join(process.cwd(), 'PLACEHOLDERS.md'), 'utf-8');
    return res.send(placeholders);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.get("/api/films", async (req, res) => {
  console.log("HIT API FILMS");
  try {
    let sheetId = "1p_VQI3HhaNQj9BiLpzvuH4WRgIxrxbDsUWnnRmKlktM"; // Default fallback
    try {
      const configText = fs.readFileSync(path.join(process.cwd(), 'SPREADSHEET_CONFIGURATION.md'), 'utf-8');
      const match = configText.match(/\*\*ID:\*\*\s*`([a-zA-Z0-9-_]+)`/);
      if (match && match[1]) {
        sheetId = match[1];
      }
    } catch(e) {}

    const response = await fetch(`https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`);
    const csvText = await response.text();
    return res.send(csvText);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.post("/api/report", async (req, res) => {
  const { messages, language = 'en' } = req.body;
  const userTurns = messages.filter((m: any) => m.role === "user").length;

  try {
    const reportPrompt = `Generate a meta-evaluation report of this annotation session. The report should be written in ${language === 'es' ? 'Spanish' : 'English'}. Include: Date of session, Quality/depth of chat insights, Duration/Turn count, Main keywords and themes explored, and general observations of the annotator's work without being repetitive. Provide thoughtful analysis of the annotations. Output strictly in Markdown format without any surrounding markdown code block wrappers.

CRITICAL INSTRUCTION: There are currently ${userTurns} user turns. If the user has not provided any annotations, messages, or interaction yet, clearly state that the session has just started and no interaction has occurred. DO NOT hallucinate, invent, or extrapolate analysis if the user has not written anything meaningful about the film.`;

    let success = false;
    let reportContent = "";
    let lastError = null;

    const priorities = getAiPriority();

    for (const provider of priorities) {
      if (success) break;
      try {
        if (provider === "gemini" && process.env.GEMINI_API_KEY) {
          const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
          const formattedHistory = messages.filter((m: any) => m.role === "user" || m.role === "assistant").map((m: any) => ({
            role: m.role === "assistant" ? "model" : "user",
            parts: [{ text: m.content }],
          }));
          const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: [...formattedHistory, { role: "user", parts: [{ text: reportPrompt }] }]
          });
          reportContent = response.text || "";
          success = true;
        } else if (provider === "openrouter" && process.env.OPENROUTER_API_KEY) {
          const openai = new OpenAI({ baseURL: "https://openrouter.ai/api/v1", apiKey: process.env.OPENROUTER_API_KEY, defaultHeaders: { "HTTP-Referer": process.env.APP_URL || "http://localhost:3000", "X-Title": "MAFI Annotator" }});
          const response = await openai.chat.completions.create({
            model: getPrimaryModel(),
            messages: [...messages.filter((m: any) => m.role === "user" || m.role === "assistant").map((m: any) => ({ role: m.role, content: m.content })), { role: "user", content: reportPrompt }]
          });
          reportContent = response.choices[0].message.content || "";
          success = true;
        } else if (provider === "mistral" && process.env.MISTRAL_API_KEY) {
          const mistral = new OpenAI({ baseURL: "https://api.mistral.ai/v1", apiKey: process.env.MISTRAL_API_KEY });
          const response = await mistral.chat.completions.create({
            model: "mistral-large-latest",
            messages: [...messages.filter((m: any) => m.role === "user" || m.role === "assistant").map((m: any) => ({ role: m.role, content: m.content })), { role: "user", content: reportPrompt }]
          });
          reportContent = response.choices[0].message.content || "";
          success = true;
        } else if (provider === "anthropic" && process.env.ANTHROPIC_API_KEY) {
          const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
          const formattedMessages = [...messages.filter((m: any) => m.role === "user" || m.role === "assistant").map((m: any) => ({ role: m.role, content: m.content })), { role: "user", content: reportPrompt }];
          // @ts-ignore
          const response = await anthropic.messages.create({
            model: "claude-3-haiku-20240307",
            max_tokens: 1024,
            messages: formattedMessages
          });
          // @ts-ignore
          reportContent = response.content[0].text;
          success = true;
        }
      } catch (err: any) {
        lastError = err;
        console.error(`${provider} API failed:`, err.message || err);
      }
    }

    if (!success) {
      return res.status(500).json({ error: "All AI providers failed or were not configured properly. " + (lastError?.message || "") });
    }

    return res.json({ report: reportContent });
  } catch (error: any) {
    console.error("LLM API Error:", error);
    return res.status(500).json({ error: error.message });
  }
});

app.post("/api/chat", async (req, res) => {
  const { messages, film, language = 'en', currentUser = '' } = req.body;

  if (!messages || !film) {
    return res.status(400).json({ error: "Missing messages or film context." });
  }

  try {
    const lastMessage = messages[messages.length - 1];

    let usageInstructions = "Documentation missing.";
    try { usageInstructions = fs.readFileSync(path.join(process.cwd(), 'USAGE.md'), 'utf-8'); } catch(e) {}
    
    let annotationGuidelines = "Guidelines missing.";
    try { annotationGuidelines = fs.readFileSync(path.join(process.cwd(), 'ANNOTATION_GUIDELINES.md'), 'utf-8'); } catch(e) {}

    let systemInstructionTemplate = "Template missing.";
    try { systemInstructionTemplate = fs.readFileSync(path.join(process.cwd(), 'SYSTEM_PROMPT.md'), 'utf-8'); } catch(e) {}
    
    const filmDataString = `Title: ${film.title}\nAssigned To: ${film.assigned_to || "Nobody"}\nCurrent Annotator: ${currentUser || "No specific user selected"}\nURL: ${film.vimeo_url}\nDescription: ${film.description || "MISSING"} (Approved: ${film.description_approved === 'true' ? 'YES' : 'NO'})\nHistoric Context: ${film.historic_context || "MISSING"} (Approved: ${film.historic_context_approved === 'true' ? 'YES' : 'NO'})\nAesthetic/Critical Commentary: ${film.aesthetic_critical_commentary || "MISSING"} (Approved: ${film.aesthetic_critical_commentary_approved === 'true' ? 'YES' : 'NO'})\nProduction Commentary: ${film.production_commentary || "MISSING"} (Approved: ${film.production_commentary_approved === 'true' ? 'YES' : 'NO'})\nTags: ${film.tags || "MISSING"} (Approved: ${film.tags_approved === 'true' ? 'YES' : 'NO'})\nAnnotator Comments: ${film.annotator_comments_optional || "MISSING"} (Approved: ${film.annotator_comments_optional_approved === 'true' ? 'YES' : 'NO'})\nGeotag: ${film.geotag || "Not Available"}\nDate: ${film.date || "Not Available"}\nPlace: ${film.place || "Not Available"}\nAuthor: ${film.author || "Not Available"}`;

    const systemInstruction = systemInstructionTemplate
      .replace(/\{\{LANGUAGE\}\}/g, language === 'es' ? 'SPANISH' : 'ENGLISH')
      .replace(/\{\{USAGE_INSTRUCTIONS\}\}/g, usageInstructions)
      .replace(/\{\{ANNOTATION_GUIDELINES\}\}/g, annotationGuidelines)
      .replace(/\{\{FILM_DATA\}\}/g, filmDataString) + "\n\nIf you use the searchWeb tool and it returns a message saying 'No search API configured', you MUST inform the user that they need to configure their TAVILY_API_KEY, PERPLEXITY_API_KEY, or BRAVE_API_KEY in the app's settings.";

    let functionCalls = null;
    let moveToNext = false;
    let replyText = "";
    let success = false;
    let lastError = null;

    const priorities = getAiPriority();

    for (const provider of priorities) {
       if (success) break;
       try {
          if ((provider === "openrouter" && process.env.OPENROUTER_API_KEY) || (provider === "mistral" && process.env.MISTRAL_API_KEY)) {
              const url = provider === "mistral" ? "https://api.mistral.ai/v1" : "https://openrouter.ai/api/v1";
              const key = provider === "mistral" ? process.env.MISTRAL_API_KEY : process.env.OPENROUTER_API_KEY;
              const modelId = provider === "mistral" ? "mistral-large-latest" : getPrimaryModel();
              const client = new OpenAI({ baseURL: url, apiKey: key });

              const orMessages = [
                { role: "system" as const, content: systemInstruction },
                ...messages.slice(0, -1).map((m: any) => ({ role: m.role as "user"|"assistant", content: m.content })),
                { role: "user" as const, content: lastMessage.content }
              ];

              const tools = [
                {
                  type: "function" as const,
                  function: {
                    name: "updateMetadata",
                    description: "Updates metadata. Do not include if absent.",
                    parameters: { type: "object", properties: { description: { type: "string" }, historic_context: { type: "string" }, aesthetic_critical_commentary: { type: "string" }, production_commentary: { type: "string" }, tags: { type: "string" }, annotator_comments_optional: { type: "string" } } }
                  }
                },
                {
                  type: "function" as const,
                  function: { name: "moveToNextFilm", description: "Suggests to move to the next film", parameters: { type: "object", properties: {} } }
                },
                {
                  type: "function" as const,
                  function: { name: "searchWeb", description: "Search the internet for currently up-to-date information.", parameters: { type: "object", properties: { query: { type: "string" } } } }
                }
              ];

              const response = await client.chat.completions.create({
                  model: modelId,
                  messages: orMessages,
                  tools: tools,
                  tool_choice: "auto"
              });

              const choice = response.choices[0];
              let requiresSecondPass = false;
              const toolOutputs = [];

              if (choice.message.tool_calls) {
                for (const call of choice.message.tool_calls as any[]) {
                  if (call.function.name === "updateMetadata") { 
                      try { functionCalls = JSON.parse(call.function.arguments); } catch(e) {} 
                      toolOutputs.push({ role: "tool", tool_call_id: call.id, name: call.function.name, content: "Metadata updated." });
                  }
                  if (call.function.name === "moveToNextFilm") {
                      moveToNext = true;
                      toolOutputs.push({ role: "tool", tool_call_id: call.id, name: call.function.name, content: "Moved to next film." });
                  }
                  if (call.function.name === "searchWeb") {
                      const { query } = JSON.parse(call.function.arguments);
                      const searchResults = await performWebSearch(query);
                      toolOutputs.push({ role: "tool", tool_call_id: call.id, name: call.function.name, content: searchResults });
                      requiresSecondPass = true;
                  }
                }
              }
              
              if (requiresSecondPass) {
                 const nextMessages: any[] = [
                    ...orMessages,
                    choice.message,
                    ...toolOutputs
                 ];
                 const nextResponse = await client.chat.completions.create({
                    model: modelId,
                    messages: nextMessages,
                    tools: tools,
                    tool_choice: "auto"
                 });
                 const nextChoice = nextResponse.choices[0];
                 replyText = nextChoice.message.content || "";
                 if (nextChoice.message.tool_calls) {
                     for (const call of nextChoice.message.tool_calls as any[]) {
                         if (call.function.name === "updateMetadata") { try { functionCalls = JSON.parse(call.function.arguments); } catch(e) {} }
                         if (call.function.name === "moveToNextFilm") moveToNext = true;
                     }
                 }
              } else {
                 replyText = choice.message.content || "";
              }
              success = true;
          } 
          else if (provider === "gemini" && process.env.GEMINI_API_KEY) {
              const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
              const formattedHistory = messages.slice(0, -1).map((m: any) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] }));
              const toolsObj = [
                {
                  // @ts-ignore
                  functionDeclarations: [
                    { name: "updateMetadata", description: "Updates metadata", parameters: { type: Type.OBJECT, properties: { description: { type: Type.STRING }, historic_context: { type: Type.STRING }, aesthetic_critical_commentary: { type: Type.STRING }, production_commentary: { type: Type.STRING }, tags: { type: Type.STRING }, annotator_comments_optional: { type: Type.STRING } } } },
                    { name: "moveToNextFilm", description: "Suggests to move to next film", parameters: { type: Type.OBJECT, properties: {} } },
                    { name: "searchWeb", description: "Search the internet for up-to-date information", parameters: { type: Type.OBJECT, properties: { query: { type: Type.STRING } } } }
                  ]
                }
              ];
              const contents = [...formattedHistory, { role: "user", parts: [{ text: lastMessage.content }] }];
              const response = await ai.models.generateContent({
                  model: "gemini-3-flash-preview",
                  contents: contents,
                  config: {
                    systemInstruction,
                    tools: toolsObj,
                  }
              });

              let requiresSecondPass = false;
              const functionResponses: any[] = [];

              if (response.functionCalls && response.functionCalls.length > 0) {
                 for (const call of response.functionCalls) {
                     if (call.name === "updateMetadata") {
                         functionCalls = call.args;
                         functionResponses.push({ functionResponse: { name: call.name, response: { result: "Metadata updated" } } });
                     }
                     if (call.name === "moveToNextFilm") {
                         moveToNext = true;
                         functionResponses.push({ functionResponse: { name: call.name, response: { result: "Moved to next film" } } });
                     }
                     if (call.name === "searchWeb") {
                         const searchResults = await performWebSearch((call.args as any).query as string);
                         requiresSecondPass = true;
                         functionResponses.push({ functionResponse: { name: call.name, response: { result: searchResults } } });
                     }
                 }
              }
              
              if (requiresSecondPass) {
                  contents.push({ role: "model", parts: response.functionCalls!.map(c => ({ functionCall: { name: c.name, args: c.args } })) });
                  contents.push({ role: "user", parts: functionResponses });
                  const nextResponse = await ai.models.generateContent({
                      model: "gemini-3-flash-preview",
                      contents: contents,
                      config: { systemInstruction, tools: toolsObj }
                  });
                  replyText = nextResponse.text || "";
                  if (nextResponse.functionCalls && nextResponse.functionCalls.length > 0) {
                      for (const call of nextResponse.functionCalls) {
                          if (call.name === "updateMetadata") functionCalls = call.args;
                          if (call.name === "moveToNextFilm") moveToNext = true;
                      }
                  }
              } else {
                  replyText = response.text || "";
              }
              success = true;
          }
          else if (provider === "anthropic" && process.env.ANTHROPIC_API_KEY) {
              const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
              const formattedMessages:any = messages.slice(0, -1).map((m: any) => ({ role: m.role as "user"|"assistant", content: m.content }));
              formattedMessages.push({ role: "user", content: lastMessage.content });

              const tools = [
                { name: "updateMetadata", description: "Updates metadata", input_schema: { type: "object" as const, properties: { description: { type: "string" }, historic_context: { type: "string" }, aesthetic_critical_commentary: { type: "string" }, production_commentary: { type: "string" }, tags: { type: "string" }, annotator_comments_optional: { type: "string" } } } },
                { name: "moveToNextFilm", description: "Suggests to move to next film", input_schema: { type: "object" as const, properties: {} } },
                { name: "searchWeb", description: "Search the internet for up-to-date information", input_schema: { type: "object" as const, properties: { query: { type: "string" } } } }
              ];
              const response = await anthropic.messages.create({
                  model: "claude-3-5-sonnet-20241022",
                  system: systemInstruction,
                  max_tokens: 1024,
                  messages: formattedMessages,
                  tools: tools
              });

              let requiresSecondPass = false;
              const toolResultBlocks: any[] = [];
              for (const block of response.content) {
                  // @ts-ignore
                  if (block.type === "text") replyText += block.text;
                  if (block.type === "tool_use") {
                      // @ts-ignore
                      if (block.name === "updateMetadata") {
                          // @ts-ignore
                          functionCalls = block.input;
                          // @ts-ignore
                          toolResultBlocks.push({ type: "tool_result", tool_use_id: block.id, content: "Metadata updated." });
                      }
                      // @ts-ignore
                      if (block.name === "moveToNextFilm") {
                          moveToNext = true;
                          // @ts-ignore
                          toolResultBlocks.push({ type: "tool_result", tool_use_id: block.id, content: "Moved to next film." });
                      }
                      // @ts-ignore
                      if (block.name === "searchWeb") {
                          requiresSecondPass = true;
                          // @ts-ignore
                          const query = block.input.query;
                          const searchResults = await performWebSearch(query);
                          // @ts-ignore
                          toolResultBlocks.push({ type: "tool_result", tool_use_id: block.id, content: searchResults });
                      }
                  }
              }
              
              if (requiresSecondPass) {
                  formattedMessages.push({ role: "assistant", content: response.content });
                  formattedMessages.push({ role: "user", content: toolResultBlocks });
                  const nextResponse = await anthropic.messages.create({
                      model: "claude-3-5-sonnet-20241022",
                      system: systemInstruction,
                      max_tokens: 1024,
                      messages: formattedMessages,
                      tools: tools
                  });
                  replyText = ""; // clear earlier text
                  for (const block of nextResponse.content) {
                      // @ts-ignore
                      if (block.type === "text") replyText += block.text;
                      if (block.type === "tool_use") {
                          // @ts-ignore
                          if (block.name === "updateMetadata") functionCalls = block.input;
                          // @ts-ignore
                          if (block.name === "moveToNextFilm") moveToNext = true;
                      }
                  }
              }
              success = true;
          }
       } catch (err: any) {
          lastError = err;
          console.error(`${provider} API failed:`, err.message || err);
       }
    }

    if (!success) {
       return res.status(500).json({ error: "All AI providers failed or were not configured properly. " + (lastError?.message || "") });
    }

    if (!replyText && functionCalls) {
      replyText = language === 'es' ? "¡He anotado esto! ¿Qué más me puedes decir sobre el filme?" : "I've noted that down! What else can you tell me about the film?";
    }

    if (functionCalls && typeof functionCalls === 'object') {
       const cleanCalls: Record<string, string> = {};
       for (const [k, v] of Object.entries(functionCalls)) {
          if (!k.endsWith('_approved')) {
             cleanCalls[k] = String(v);
          }
       }
       functionCalls = cleanCalls;
    }

    return res.json({ text: replyText, functionCalls, moveToNext });

  } catch (error: any) {
    console.error("LLM API Error:", error);
    return res.status(500).json({ error: error.message });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });

    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    
    // Explicitly handle all other routes with index.html for SPA fallback
    app.get('*all', (req, res) => {
      try {
        const html = fs.readFileSync(path.join(process.cwd(), 'dist/index.html'), 'utf-8');
        res.send(html);
      } catch (e) {
        res.status(404).send('Not Found');
      }
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();


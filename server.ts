import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import * as dotenv from 'dotenv';
import fs from 'fs';
dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Clients
const getAiPriority = () => {
  let priority = ["openrouter", "gemini", "anthropic", "mistral"];
  try {
    const configText = fs.readFileSync(path.join(process.cwd(), 'AI_CONFIGURATION.md'), 'utf-8');
    const match = configText.match(/\*\*PRIORITY:\*\*\s*(.+)/);
    if (match && match[1]) {
       priority = match[1].replace(/`/g, '').split(",").map(s => s.trim().toLowerCase());
    }
  } catch(e) {}
  return priority;
};

// Helper function to read primary model configuration
function getPrimaryModel() {
  let model = process.env.OPENROUTER_MODEL || "openai/gpt-4o-mini"; // Default fallback
  try {
    const configText = fs.readFileSync(path.join(process.cwd(), 'AI_CONFIGURATION.md'), 'utf-8');
    const match = configText.match(/\*\*MODEL:\*\*\s*`([a-zA-Z0-9-_.\/]+)`/);
    if (match && match[1]) {
      model = match[1];
    }
  } catch(e) {}
  return model;
}

app.get("/api/guidelines", (req, res) => {
  try {
    const guidelines = fs.readFileSync(path.join(process.cwd(), 'ANNOTATION_GUIDELINES.md'), 'utf-8');
    res.send(guidelines);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/placeholders", (req, res) => {
  try {
    const placeholders = fs.readFileSync(path.join(process.cwd(), 'PLACEHOLDERS.md'), 'utf-8');
    res.send(placeholders);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/films", async (req, res) => {
  try {
    let sheetId = "1p_VQI3HhaNQj9BiLpzvuH4WRgIxrxbDsUWnnRmKlktM"; // Default fallback
    try {
      const configText = fs.readFileSync(path.join(process.cwd(), 'SPREADSHEET_CONFIGURATION.md'), 'utf-8');
      const match = configText.match(/\*\*ID:\*\*\s*`([a-zA-Z0-9-_]+)`/);
      if (match && match[1]) {
        sheetId = match[1];
      }
    } catch(e) {
      console.warn("Could not read SPREADSHEET_CONFIGURATION.md, using default ID");
    }

    const response = await fetch(`https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`);
    const csvText = await response.text();
    res.send(csvText);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
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

    res.json({ report: reportContent });
  } catch (error: any) {
    console.error("LLM API Error:", error);
    res.status(500).json({ error: error.message });
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
      .replace(/\{\{FILM_DATA\}\}/g, filmDataString);

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
                }
              ];

              const response = await client.chat.completions.create({
                  model: modelId,
                  messages: orMessages,
                  tools: tools,
                  tool_choice: "auto"
              });

              const choice = response.choices[0];
              if (choice.message.tool_calls) {
                for (const call of choice.message.tool_calls) {
                  if (call.function.name === "updateMetadata") { try { functionCalls = JSON.parse(call.function.arguments); } catch(e) {} }
                  if (call.function.name === "moveToNextFilm") moveToNext = true;
                }
              }
              replyText = choice.message.content || "";
              success = true;
          } 
          else if (provider === "gemini" && process.env.GEMINI_API_KEY) {
              const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
              const formattedHistory = messages.slice(0, -1).map((m: any) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] }));
              const response = await ai.models.generateContent({
                  model: "gemini-2.5-flash",
                  contents: [...formattedHistory, { role: "user", parts: [{ text: lastMessage.content }] }],
                  config: {
                    systemInstruction,
                    tools: [{
                      // @ts-ignore
                      functionDeclarations: [
                        { name: "updateMetadata", description: "Updates metadata", parameters: { type: Type.OBJECT, properties: { description: { type: Type.STRING }, historic_context: { type: Type.STRING }, aesthetic_critical_commentary: { type: Type.STRING }, production_commentary: { type: Type.STRING }, tags: { type: Type.STRING }, annotator_comments_optional: { type: Type.STRING } } } },
                        { name: "moveToNextFilm", description: "Suggests to move to next film", parameters: { type: Type.OBJECT, properties: {} } }
                      ]
                    }]
                  }
              });
              if (response.functionCalls && response.functionCalls.length > 0) {
                 for (const call of response.functionCalls) {
                     if (call.name === "updateMetadata") functionCalls = call.args;
                     if (call.name === "moveToNextFilm") moveToNext = true;
                 }
              }
              replyText = response.text || "";
              success = true;
          }
          else if (provider === "anthropic" && process.env.ANTHROPIC_API_KEY) {
              const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
              const formattedMessages:any = messages.slice(0, -1).map((m: any) => ({ role: m.role as "user"|"assistant", content: m.content }));
              formattedMessages.push({ role: "user", content: lastMessage.content });

              const response = await anthropic.messages.create({
                  model: "claude-3-5-sonnet-20241022",
                  system: systemInstruction,
                  max_tokens: 1024,
                  messages: formattedMessages,
                  tools: [
                    { name: "updateMetadata", description: "Updates metadata", input_schema: { type: "object" as const, properties: { description: { type: "string" }, historic_context: { type: "string" }, aesthetic_critical_commentary: { type: "string" }, production_commentary: { type: "string" }, tags: { type: "string" }, annotator_comments_optional: { type: "string" } } } },
                    { name: "moveToNextFilm", description: "Suggests to move to next film", input_schema: { type: "object" as const, properties: {} } }
                  ]
              });

              for (const block of response.content) {
                  // @ts-ignore
                  if (block.type === "text") replyText += block.text;
                  if (block.type === "tool_use") {
                      // @ts-ignore
                      if (block.name === "updateMetadata") functionCalls = block.input;
                      // @ts-ignore
                      if (block.name === "moveToNextFilm") moveToNext = true;
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

    res.json({ text: replyText, functionCalls, moveToNext });

  } catch (error: any) {
    console.error("LLM API Error:", error);
    res.status(500).json({ error: error.message });
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
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

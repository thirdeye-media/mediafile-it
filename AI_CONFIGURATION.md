# AI Configuration

This file configures the AI models used by the application, their priority sequence, and the keys setup.

## Provider Priority

**PRIORITY:** `openrouter, gemini, anthropic, mistral`

You can change the order above to prioritize different AI providers. The system will attempt to use the first provider in the list. If that provider's API key is missing or the request fails, it will seamlessly fall back to the next one in the line, and so forth.

## Primary Model Name

**MODEL:** `openai/gpt-4o-mini`

You can change the model above to any supported OpenRouter model string (e.g., `anthropic/claude-3-haiku`, `meta-llama/llama-3-8b-instruct`). Note that this specific setting mostly affects OpenRouter requests, whereas Anthropic, Mistral, and Gemini currently use their standard fast models (`claude-3-haiku-20240307`, `mistral-large-latest`, `gemini-2.5-flash`).

**IMPORTANT: Keep the `**MODEL:** \`[YOUR_MODEL]\`` and `**PRIORITY:** \`[YOUR_PRIORITY]\`` format exactly as it is, as the application parses this file to extract it.**

## ⚠️ API Keys (Security Warning)

**DO NOT PUT API KEYS IN THIS FILE OR ANY OTHER .MD FILE.**

This file is tracked by version control (Git). Storing API keys here will expose them to anyone who can see the code. The industry standard, secure way to manage API keys is through **Environment Variables**.

Here is how you set your API keys depending on where you run the app:

1. **In Google AI Studio:** You can configure keys manually in the interface. To do so, open the "API Keys & Secrets" or "Settings Menu" (bottom left). Add keys using these exact names:
   * `GEMINI_API_KEY` (usually injected automatically by Google, but you can explicitly replace or ensure it)
   * `OPENROUTER_API_KEY`
   * `ANTHROPIC_API_KEY`
   * `MISTRAL_API_KEY`
2. **On your local computer:** Create a `.env` file in the main folder (this file is ignored by Git automatically) and add:
   ```
   OPENROUTER_API_KEY=your_key_here
   GEMINI_API_KEY=your_key_here
   ANTHROPIC_API_KEY=your_key_here
   MISTRAL_API_KEY=your_key_here
   ```
3. **In Production (Vercel, Render, Heroku):** Use your hosting provider's "Environment Variables" or "Secrets" dashboard in their web interface.

Because the core code looks for `process.env.[KEY_NAME]`, it will flawlessly load the keys manually from whatever secure environment you set them in!

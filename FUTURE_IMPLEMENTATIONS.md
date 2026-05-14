# Future Implementations

This document serves as a reference for future developers, contributors, or maintainers of **CineFile_it** who are interested in extending the application's capabilities. 

## Proposed Feature: Voice Chat Interface

One of the most promising future enhancements for CineFile_it is the integration of voice interactions, allowing the annotator to speak to the AI assistant and hear verbal responses. 

### Why Voice? (Advantages)
- **Hands-Free Workflow:** Annotators can keep their eyes on the film and dictate their thoughts simultaneously, streamlining the experience.
- **Natural Conversation:** People tend to be highly descriptive when speaking compared to typing, potentially yielding richer qualitative metadata for fields like `aesthetic_critical_commentary`.
- **Accessibility & Speed:** Faster input for longer observations and notes.

### Potential Drawbacks & Challenges
- **Environmental Noise:** Annotators might be in noisy environments, requiring good noise-cancellation.
- **Media Audio Collision:** The film’s audio could bleed into the microphone, confusing the AI. The UI would need a "push-to-talk" mechanism or auto-pause functionality during recording.
- **Transcription Limits:** Accurately transcribing specialized film terminology, proper names, or mixed-language speech (e.g., speaking in English but referring to a Spanish title) can be difficult.
- **Latency:** Real-time conversational flows require low-latency infrastructure; otherwise, the unnatural pauses break the UX.
- **Cost:** API-based audio processing is generally more expensive than text tokens.

---

## Proposed Feature: Advanced Spreadsheet Integration

Currently, CineFile_it uses a public Google Sheet CSV export and strict column mapping. Future enhancements could make this much more flexible:

- **Full Google Sheets API Integration:** Instead of downloading a CSV and manually dealing with file exports/uploads, the app could authenticate via the Google Sheets API. This would allow real-time read and write sync directly to the spreadsheet without needing to export files.
- **Dynamic Column Mapping:** Rather than requiring exact English column names (`slug`, `title`, `vimeo_url`, etc.), the app could parse the CSV headers and provide a UI for the user to map their existing spreadsheet columns to the app's internal fields (e.g., "Map your 'Link' column to 'Vimeo URL'").
- **Private Spreadsheet Support:** With OAuth integration, the app could read private sheets securely, rather than requiring the "Anyone with the link can view" permission setting currently used.

---

### Implementation Approaches

If you decide to build this, here are the three primary architectural approaches, ordered by complexity:

#### 1. Browser-Native Web Speech API (Speech-to-Text & Text-to-Speech)
You can use the built-in HTML5 Web Speech API to transcribe user speech to text, send the text to the backend as normal, and then use the `SpeechSynthesis` API to "read" the AI's response aloud.
* **Pros:** Completely free. No additional backend infrastructure needed. Minimal latency.
* **Cons:** Transcription accuracy is highly dependent on the user's browser (e.g., Chrome uses Google's servers, Firefox uses an offline engine). Inconsistent experience across devices.

#### 2. Cloud Audio APIs (e.g., OpenAI Whisper + External TTS)
The client records an audio snippet (using the standard Web Audio API / MediaRecorder) and sends it to the server. The server uses a high-accuracy transcription model like OpenAI's Whisper to turn it into text, processes the LLM response, and then uses a Text-to-Speech service (like Google Cloud TTS or ElevenLabs) to send audio back.
* **Pros:** Exceptionally high accuracy. Handles multiple languages smoothly. Consistent experience across all platforms.
* **Cons:** "Turn-based" latency. The record -> upload -> transcribe -> infer -> generate TTS -> download pipeline can take several seconds.

#### 3. Native Multimodal WebSocket APIs (Gemini Live API or OpenAI Realtime API)
Modern LLMs support direct audio-in/audio-out via WebSockets or WebRTC. Instead of transcribing first, you stream the user's raw audio directly to the model, and the model streams raw audio back.
* **Pros:** Ultra-low latency conversational flow. The AI can be natively interrupted ("barge-in"). The model can infer emotional tone from the user's voice and respond with expressive inflections.
* **Cons:** Complex to implement (requires stateful persistent WebSocket connections rather than simple REST endpoints). Highest operational cost per minute. 

### UI/UX Recommendations for Voice
When implementing any of the above, consider the following UI changes:
1. **Audio Visualizer:** Give the user visual feedback that their microphone is picking up sound.
2. **Push-to-Talk vs. Wake Word:** A "hold spacebar to talk" or "click to record" interaction is usually safer for video analysis tools to prevent the film's audio from triggering the assistant.
3. **Mute Toggles:** Ensure there are clear controls to mute the AI's voice and revert to text-only mode anytime.

# Module 5 — Conversational Assistant

## What's in this module
- `backend/functions/assistant-service/`:
  - `intentRouter.js` — rule-based intent classification (case lookup,
    hotspot, trend, network) plus case-reference extraction (crime number
    or case ID regexes) and Zia NER entity extraction.
  - `index.js` — `POST /assistant/query`, dispatches to `data-service`,
    `analytics-service`, or `network-service` based on the classified
    intent, and composes a short reply.
- `frontend/src/components/ChatAssistant.jsx` — chat UI with text input and
  a voice-input button (🎙️).
- `frontend/src/api/assistantService.js` — fetch wrapper.

## Important scope note — please read before demoing

This is a **rule-based router**, not an LLM. It matches keywords/regexes to
one of four intents and calls the right backend service — deliberately
simple and auditable, in keeping with staying Catalyst-native, but it will
misfire on phrasing it doesn't recognize (e.g. it won't understand
"what happened near MG Road last week" the way an LLM-based assistant
would). If judges push on free-form conversation, be upfront that this is
a first-pass router and the natural extension (mentioned back in the
tech-stack discussion) is a RAG/LLM layer on top — call that out as
"future development" in the deck rather than overclaiming today's
capability.

**Voice input** uses the browser's built-in Web Speech API
(`SpeechRecognition`), not a Zia speech-to-text call — I couldn't confirm
a Node-SDK speech-to-text endpoint in Catalyst's docs, so this keeps voice
capture entirely client-side and free, converting speech to text in the
browser before it ever reaches `assistant-service`. If Catalyst does
expose a server-side speech API you want to use instead, flag it and this
can be swapped in.

## Setup steps

1. **Set `INTERNAL_BASE_URL`** as an environment variable on
   `assistant-service` (console → Functions → assistant-service →
   Environment Variables) — the project's function base, e.g.
   `https://<project-domain>/server`.
2. **Deploy**:
   ```
   cd backend/functions/assistant-service
   npm install
   catalyst functions:deploy
   ```
3. **Wire the frontend** — add `<ChatAssistant />` wherever it should
   appear (dashboard sidebar, dedicated page, etc.) and set
   `REACT_APP_ASSISTANT_SERVICE_URL` once deployed.
4. **Test**:
   - "What's the status of case 1?" → CASE_LOOKUP
   - "Where are the current hotspots?" → HOTSPOT
   - "Show me the crime trend" → TREND
   - "Who is connected to case 1?" → NETWORK

## Next module
Module 6 — Automated reports (SmartBrowz PDF generation), likely using
`data-service`/`analytics-service` output as the report content source.

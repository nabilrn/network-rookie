\# Network Rookie — GitHub Copilot Instructions



\## Project Overview

Network Rookie is a React + Vite + TypeScript interactive exhibition tool

that visualizes the global internet infrastructure for complete beginners.

Target audience: zero technical background, walk-up exhibition visitors.



\## Tech Stack

\- React 18 + Vite + TypeScript

\- globe.gl (3D globe rendering)

\- Gemini AI (google AI studio, called direct from frontend, no backend)

\- Netlify (static deploy)

\- pnpm as package manager



\## Core Philosophy

NEVER use technical jargon without an immediate plain-English explanation.

ALWAYS prefer human analogies over technical accuracy.

ALWAYS show/animate before explaining in text.

The experience must be understandable within 30 seconds by a complete beginner.



\## Project Structure

src/

├── App.tsx                    # Root, holds all state via useAppState

├── hooks/

│   ├── useAppState.ts         # Global state: selectedCity, selectedArc,

│   │                          # simulationMode, osiStep, theme

│   └── useGeminiChat.ts       # Gemini API hook (JSON payload parser + action support)

├── components/

│   ├── BrowserChrome.tsx      # Top bar, theme toggle, DEV badge

│   ├── GlobeSection.tsx       # Globe + HUD + city dialog + PacketDots

│   ├── HUD.tsx                # Stats overlay on globe

│   ├── SimToolbar.tsx         # Legacy; simulation controls currently rendered in ChatInterface

│   ├── RightPanel.tsx         # Right sidebar container (AI chat + action router)

│   ├── SelectionDrawer.tsx    # Shows city/arc info when selected

│   ├── OSICards.tsx           # Journey steps (NOT OSI layers anymore)

│   ├── ChatInterface.tsx      # AI chat UI

│   ├── InactivityWatcher.tsx  # Auto-reset after 3 min

│   └── OfflineBanner.tsx      # Shows when navigator.onLine = false

└── data/

&#x20;   └── network.ts             # CITIES, CONNECTIONS, CHIP\_QUESTIONS



\## State Architecture

Global state lives in useAppState hook, lifted to App.tsx.

Props flow DOWN: App → GlobeSection/RightPanel → children.

Callbacks flow UP: onCitySelect, onArcSelect, onModeChange.

GlobeSection also maintains internal STATE object for globe.gl render().

Both must stay in sync — when globe fires onCitySelect(idx), 

App.tsx updates React state, which flows back down as props.



\## Data Shape



\### CITIES

{

&#x20; id: string           // 'sgp', 'tok', 'lon', etc.

&#x20; name: string         // 'Singapore'

&#x20; flag: string         // '🇸🇬'

&#x20; lat: number

&#x20; lng: number

&#x20; region: string       // 'Southeast Asia'

&#x20; hubTier: number      // 1 = Major Hub, 2 = Regional Hub

&#x20; fact: string         // technical fact (for AI context)

&#x20; friendlyFact: string // beginner-friendly one-liner

&#x20; heroStat: string     // e.g. "Connects to 6 continents"

}



\### CONNECTIONS

{

&#x20; from: string         // city id

&#x20; to: string           // city id

&#x20; latency: number      // ms

&#x20; cable: string        // 'FASTER', 'SEA-ME-WE 4', etc.

&#x20; type: string         // 'Subsea cable' or 'Land cable'

&#x20; bandwidth: string    // '60 Tbps'

&#x20; distanceKm: number   // approximate cable distance

&#x20; depthM: number       // average ocean depth in meters

&#x20; blinkComparison: string  // human latency analogy

&#x20; funFact: string      // one interesting fact about this cable

}



\### CHIP\_QUESTIONS

Record<cityId | 'default', string\[]>

Beginner-friendly questions, no jargon.

Each city has 3 questions. Default fallback for unrecognized city.



\## Gemini API



\### Setup

API key from environment: import.meta.env.VITE\_GEMINI\_API\_KEY

Endpoint template: https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent?key=KEY

Default model comes from VITE_GEMINI_MODEL (fallback to gemini-flash-lite-latest).

Called directly from frontend — no backend proxy needed.

Free tier limits: 15 req/min, 1500 req/day — sufficient for exhibition.



\### Message Format

{

&#x20; role: 'user' | 'model'

&#x20; parts: \[{ text: string }]

}



\### System Instruction

Separate from messages array:

{ system\_instruction: { parts: \[{ text: systemPrompt }] } }



\### Response Types

Gemini ALWAYS returns valid JSON. Parse response text as JSON.

Five types:



1\. journey — user wants to simulate data travel

{

&#x20; type: 'journey',

&#x20; fromId: string,      // city id

&#x20; toId: string,        // city id  

&#x20; steps: \[

&#x20;   { emoji: string, title: string, body: string }  // always 4 steps

&#x20; ],

&#x20; story: string        // 2 sentences for chat display

}



2\. explain — user asks a question

{

&#x20; type: 'explain',

&#x20; content: string,         // max 80 words, plain English

&#x20; analogy: string,         // one-sentence real-world comparison

&#x20; highlightCityId?: string // optional city to highlight

}



3\. scenario — user asks about simulation modes

{

&#x20; type: 'scenario',

&#x20; mode: 'high-load' | 'packet-loss' | 'cable-cut',

&#x20; story: string            // plain English narration

}



4\. fact — idle fun fact

{

&#x20; type: 'fact',

&#x20; emoji: string,

&#x20; content: string          // max 30 words

}



5\. action — trigger direct UI action

{

&#x20; type: 'action',

&#x20; action: 'SET_MODE' | 'FOCUS_CITY',

&#x20; payload: string,          // mode id or city id/alias

&#x20; message: string           // plain English narration

}



\## Component Responsibilities



\### ChatInterface.tsx

\- Renders message history, input, chips, typing indicator

\- Uses useGeminiChat hook

\- Fires onJourney(payload) when response type === 'journey'

\- Fires onScenario(mode) when response type === 'scenario'

\- Fires onAction(action, payload) when response type === 'action'

\- Pre-populates first message as AI welcome (not from API)

\- Chips come from CHIP\_QUESTIONS keyed by selected city id

\- Country focus chips should trigger onAction('FOCUS\_CITY', cityId) immediately before sending AI prompt



\### SelectionDrawer.tsx  

\- Shows nothing when selectedCity and selectedArc are both null

\- City selected: flag, name, hub tier label, friendlyFact, heroStat

\- Arc selected: 4-step journey cards (animate in sequence)

\- Reads data from CITIES/CONNECTIONS arrays directly — no API call

\- Hub tier display: 1 = "Major Internet Hub 🌐", 2 = "Regional Hub"

\- Latency display: always append blinkComparison

\- Cable type display: 'Subsea cable' → "Underwater cable 🌊"

&#x20;                     'Land cable'   → "Underground cable 🌍"



\### GlobeSection.tsx (ref interface)

Exposes via useImperativeHandle:

\- globeRef — direct globe.gl instance access

\- triggerJourney(fromId, toId) — highlights route, flies camera

\- triggerReset() — resets globe to default auto-rotating state



\### Simulation controls (current UI)

Simulation controls are rendered inside ChatInterface as chips:

\- 'normal'       → "🌐 Normal"

\- 'high-load'    → "🚦 Rush Hour"  

\- 'packet-loss'  → "📶 Packet Loss"

\- 'cable-cut'    → "✂️ Cable Break"



\## UX Rules

1\. Right panel is always AI chat + simulation controls (no empty/city/arc drawer state in current implementation)

2\. Globe hint overlay shows until first city tap, then never again

3\. City tooltips show flag + name + friendlyFact only (no lat/lng/load)

4\. City detail dialog appears on globe when city selected

5\. Closing city dialog must clear selection and restore auto-rotate

6\. All error messages in plain English, no HTTP codes shown to user

7\. Inactivity reset at 3 min — countdown overlay at 2.5 min

8\. Offline banner appears automatically, no user action needed

9\. DEV MODE badge must be removed before production deploy



\## Code Style

\- TypeScript strict mode

\- Functional components only, no class components  

\- useEffect cleanup always included

\- No any types except globe.gl internals (globe.gl has no TS types)

\- CSS variables for all colors (defined in theme.css)

\- No inline styles except dynamic values that depend on JS state

\- Component files include CSS import from same-named .css file



\## What NOT to Do

\- Never call a backend API — all data is static from network.ts

\- Never store API key in code — always use import.meta.env

\- Never use OSI layer terminology in UI copy facing visitors

\- Never show raw latency without a human comparison

\- Never show lat/lng coordinates to visitors

\- Never use "packet", "protocol", "bandwidth" without explanation

\- Never add new npm dependencies without checking bundle size impact


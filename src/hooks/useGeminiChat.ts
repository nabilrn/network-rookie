import { useCallback, useMemo, useRef, useState } from 'react';
import {
  CHIP_QUESTIONS,
  CITIES,
  CONNECTIONS,
  CITY_ALIASES,
  resolveCityId,
} from '../data/network';

type MessageRole = 'user' | 'model';

export interface ChatMessage {
  role: MessageRole;
  parts: [{ text: string }];
}

type JourneyStep = {
  emoji: string;
  title: string;
  body: string;
};

export interface JourneyResponse {
  type: 'journey';
  fromId: string;
  toId: string;
  steps: [JourneyStep, JourneyStep, JourneyStep, JourneyStep];
  story: string;
}

export interface ExplainResponse {
  type: 'explain';
  content: string;
  analogy: string;
  highlightCityId?: string;
}

export interface ScenarioResponse {
  type: 'scenario';
  mode: 'high-load' | 'packet-loss' | 'cable-cut';
  story: string;
}

export interface FactResponse {
  type: 'fact';
  emoji: string;
  content: string;
}

export interface ActionResponse {
  type: 'action';
  action: 'SET_MODE' | 'FOCUS_CITY';
  payload: string;
  message: string;
}

export type GeminiPayload =
  | JourneyResponse
  | ExplainResponse
  | ScenarioResponse
  | FactResponse
  | ActionResponse;

type GeminiChatContext = {
  selectedCity: number | null;
  selectedArc: number | null;
  simulationMode: string | null;
  osiStep: number | null;
};

type GeminiApiResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
};

const PRIMARY_GEMINI_MODEL =
  (import.meta.env.VITE_GEMINI_MODEL as string | undefined)?.trim() ||
  'gemini-flash-lite-latest';

const FALLBACK_GEMINI_MODELS = [
  'gemini-2.0-flash-lite-001',
  'gemini-2.0-flash-lite',
  'gemini-2.5-flash-lite',
  'gemini-2.0-flash',
];

function modelUrl(model: string): string {
  return `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
}

const MODE_LABELS: Record<string, string> = {
  normal: '🌐 Normal (traffic is flowing smoothly)',
  'high-load': '🚦 Rush Hour (internet highways are extra busy)',
  'packet-loss': '📶 Bad Signal (some data gets lost and resent)',
  'cable-cut': '✂️ Cable Breaks (a route is disrupted)',
};

function stripMarkdownFences(input: string): string {
  const trimmed = input.trim();
  const fenced = trimmed.match(/^```[a-zA-Z]*\s*([\s\S]*?)\s*```$/);
  return fenced ? fenced[1].trim() : trimmed;
}

function safeCityByIndex(index: number | null) {
  if (index === null) return null;
  return CITIES[index] ?? null;
}

function safeConnectionByIndex(index: number | null) {
  if (index === null) return null;
  return CONNECTIONS[index] ?? null;
}

function modeLabel(mode: string | null): string {
  if (!mode) return MODE_LABELS.normal;
  return MODE_LABELS[mode] ?? `Custom mode: ${mode}`;
}

function buildSystemPrompt(ctx: GeminiChatContext, simplified: boolean): string {
  const selectedCity = safeCityByIndex(ctx.selectedCity);
  const selectedConnection = safeConnectionByIndex(ctx.selectedArc);
  const fromCity = selectedConnection
    ? CITIES.find(city => city.id === selectedConnection.from)
    : null;
  const toCity = selectedConnection
    ? CITIES.find(city => city.id === selectedConnection.to)
    : null;

  const cityContext = selectedCity
    ? `${selectedCity.name} (${selectedCity.id}), ${selectedCity.region}, tier ${selectedCity.hubTier === 1 ? 'Major Internet Hub' : 'Regional Hub'}`
    : 'none selected';

  const arcContext = selectedConnection
    ? `${fromCity?.name ?? selectedConnection.from} -> ${toCity?.name ?? selectedConnection.to}, cable ${selectedConnection.cable}, latency ${selectedConnection.latency}ms, distance ${selectedConnection.distanceKm}km`
    : 'none selected';

  const cityIds = CITIES.map(city => city.id).join(', ');
  const aliases = Object.entries(CITY_ALIASES)
    .map(([alias, id]) => `${alias}->${id}`)
    .join(', ');

  const schema = `Allowed JSON response shapes only:
1) {"type":"journey","fromId":"cityId","toId":"cityId","steps":[{"emoji":"...","title":"...","body":"..."},{"emoji":"...","title":"...","body":"..."},{"emoji":"...","title":"...","body":"..."},{"emoji":"...","title":"...","body":"..."}],"story":"two short sentences"}
2) {"type":"explain","content":"max 80 words, plain English","analogy":"one sentence analogy","highlightCityId":"optional cityId"}
3) {"type":"scenario","mode":"high-load|packet-loss|cable-cut","story":"plain English narration"}
4) {"type":"fact","emoji":"...","content":"max 30 words"}
5) {"type":"action","action":"SET_MODE|FOCUS_CITY","payload":"mode or cityId","message":"plain English narration"}`;

  if (simplified) {
    return [
      'You are a friendly museum guide for internet beginners.',
      'Respond in valid JSON only. No markdown. No code fences.',
      schema,
      `Valid city IDs: ${cityIds}`,
      `Alias map for fuzzy matching: ${aliases}`,
      'If user asks about data travel, use type "journey" with exactly 4 steps.',
      'If user asks a question, use type "explain" and keep content under 80 words.',
      'For scenario and SET_MODE action responses, explain both what visitors see and what causes that mode.',
      'For scenario.story, use exactly 3 short lines with these labels: "What you see:", "Why it happens:", "User impact:".',
      'In "Why it happens", mention at least 2 realistic causes.',
      'Use plain English only. If you use "packet", immediately explain it as "small pieces of data".',
      'If user commands to change simulation or focus on a city, use type "action".',
      `Current context: city=${cityContext}; arc=${arcContext}; mode=${modeLabel(ctx.simulationMode)}; step=${ctx.osiStep ?? 'none'}.`,
    ].join('\n');
  }

  return [
    'You are Network Rookie, a friendly museum guide helping complete beginners understand how the internet moves messages around the world.',
    'Always use warm, simple language with everyday analogies.',
    'ALWAYS return valid JSON only. Do not add markdown, headings, or code fences.',
    schema,
    `Current selected city: ${cityContext}.`,
    `Current selected route: ${arcContext}.`,
    `Current simulation mode: ${modeLabel(ctx.simulationMode)}.`,
    `Current journey step: ${ctx.osiStep ?? 'none selected'}.`,
    `Available city IDs for routing: ${cityIds}.`,
    `City alias mapping for fuzzy matching: ${aliases}.`,
    'For explain responses, keep content to 80 words or fewer and add one clear analogy sentence.',
    'For scenario responses, story must be exactly 4 short lines with these labels: "What you see:", "Why it happens:", "User impact:", "What to do:".',
    'In "Why it happens", mention at least 2 realistic, specific causes for the selected mode.',
    'In "What to do:", suggest one simple action (e.g., "wait", "try another route", "refresh the page").',
    '',
    '--- Mode-specific guidance ---',
    'When mode is high-load:',
    '  - Causes: peak evening usage (6-10pm), viral streaming event, game/software release day, holidays, natural disaster news spike',
    '  - User impact: videos buffer, websites load slowly, file downloads crawl, video calls stutter',
    '',
    'When mode is packet-loss:',
    '  - Causes: weak WiFi or cellular signal, electrical interference near cables, network congestion causing drops, damaged fiber link',
    '  - Always explain "packet" as "small piece of data"',
    '  - User impact: video/audio cuts out, chat messages delayed, images fail to load, repeated retries',
    '',
    'When mode is cable-cut:',
    '  - Causes: ship anchor damage (most common), undersea earthquake, construction accident, hurricane/storm damage, maintenance error',
    '  - User impact: entire region isolated, users cannot access services, messaging fails, no streaming possible',
    '',
    'For SET_MODE action responses, message must include at least 2 specific causes and one clear user impact in plain English.',
    'Avoid unexplained jargon. Prefer simple words and short sentences.',
    'If a city is mentioned with an alias, map it to the city ID from the alias map.',
    'If user commands to change the simulation mode or look at a city, use type "action" to trigger UI change.',
  ].join('\n');
}

function parsePayload(rawText: string): GeminiPayload {
  const cleaned = stripMarkdownFences(rawText);
  const parsed: unknown = JSON.parse(cleaned);

  if (!parsed || typeof parsed !== 'object' || !('type' in parsed)) {
    throw new Error('Missing payload type');
  }

  const payload = parsed as Record<string, unknown>;

  if (payload.type === 'journey') {
    const steps = payload.steps;
    if (
      typeof payload.fromId !== 'string' ||
      typeof payload.toId !== 'string' ||
      !Array.isArray(steps) ||
      steps.length !== 4 ||
      typeof payload.story !== 'string'
    ) {
      throw new Error('Invalid journey payload');
    }

    const validSteps = steps.every(
      step =>
        typeof step === 'object' &&
        step !== null &&
        typeof (step as Record<string, unknown>).emoji === 'string' &&
        typeof (step as Record<string, unknown>).title === 'string' &&
        typeof (step as Record<string, unknown>).body === 'string',
    );

    if (!validSteps) throw new Error('Invalid journey steps');

    return payload as JourneyResponse;
  }

  if (payload.type === 'explain') {
    if (
      typeof payload.content !== 'string' ||
      typeof payload.analogy !== 'string' ||
      (payload.highlightCityId !== undefined &&
        typeof payload.highlightCityId !== 'string')
    ) {
      throw new Error('Invalid explain payload');
    }
    return payload as ExplainResponse;
  }

  if (payload.type === 'scenario') {
    if (
      (payload.mode !== 'high-load' &&
        payload.mode !== 'packet-loss' &&
        payload.mode !== 'cable-cut') ||
      typeof payload.story !== 'string'
    ) {
      throw new Error('Invalid scenario payload');
    }
    return payload as ScenarioResponse;
  }

  if (payload.type === 'fact') {
    if (typeof payload.emoji !== 'string' || typeof payload.content !== 'string') {
      throw new Error('Invalid fact payload');
    }
    return payload as FactResponse;
  }

  if (payload.type === 'action') {
    if (
      (payload.action !== 'SET_MODE' && payload.action !== 'FOCUS_CITY') ||
      typeof payload.payload !== 'string' ||
      typeof payload.message !== 'string'
    ) {
      throw new Error('Invalid action payload');
    }
    if (payload.action === 'FOCUS_CITY') {
      const normalizedCityId = resolveCityId(payload.payload);
      return {
        type: 'action',
        action: 'FOCUS_CITY',
        payload: normalizedCityId ?? payload.payload,
        message: payload.message,
      };
    }

    return payload as ActionResponse;
  }

  throw new Error('Unknown payload type');
}

function extractModelText(apiResponse: GeminiApiResponse): string {
  const text = apiResponse.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text || typeof text !== 'string') {
    throw new Error('The AI response came back empty.');
  }
  return text;
}

async function callGemini(
  messages: ChatMessage[],
  ctx: GeminiChatContext,
  simplifiedPrompt: boolean,
): Promise<{ payload: GeminiPayload; modelText: string }> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;
  if (!apiKey) {
    throw new Error('Gemini API key is missing. Please set VITE_GEMINI_API_KEY.');
  }

  const requestBody = JSON.stringify({
    system_instruction: {
      parts: [{ text: buildSystemPrompt(ctx, simplifiedPrompt) }],
    },
    contents: messages,
    generationConfig: {
      responseMimeType: 'application/json',
    },
  });

  const modelsToTry = [PRIMARY_GEMINI_MODEL, ...FALLBACK_GEMINI_MODELS];
  let response: Response | null = null;
  for (const model of modelsToTry) {
    response = await fetch(`${modelUrl(model)}?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: requestBody,
    });

    if (response.ok || response.status !== 404) {
      break;
    }
  }

  if (!response) {
    throw new Error('Could not reach the AI guide right now. Please try again.');
  }

  if (!response.ok) {
    let retryMessage = 'Could not reach the AI guide right now. Please try again.';
    if (response.status === 429) {
      retryMessage = 'The AI guide is busy right now. Please wait a minute and try again.';
    }
    throw new Error(retryMessage);
  }

  const data = (await response.json()) as GeminiApiResponse;
  const modelText = extractModelText(data);
  return {
    payload: parsePayload(modelText),
    modelText: stripMarkdownFences(modelText),
  };
}

export function useGeminiChat(ctx: GeminiChatContext) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastPayload, setLastPayload] = useState<GeminiPayload | null>(null);
  const lastUserTextRef = useRef<string | null>(null);

  const chips = useMemo(() => {
    const selectedCityId =
      ctx.selectedCity !== null ? CITIES[ctx.selectedCity]?.id : undefined;
    return CHIP_QUESTIONS[selectedCityId ?? ''] ?? CHIP_QUESTIONS.default;
  }, [ctx.selectedCity]);

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || loading) return;

      const beforeSend = messages;
      const userMessage: ChatMessage = { role: 'user', parts: [{ text: trimmed }] };
      const nextMessages = [...beforeSend, userMessage];

      setLoading(true);
      setError(null);
      setMessages(nextMessages);
      lastUserTextRef.current = trimmed;

      try {
        let result: { payload: GeminiPayload; modelText: string };

        try {
          result = await callGemini(nextMessages, ctx, false);
        } catch (firstAttemptError) {
          if (firstAttemptError instanceof SyntaxError) {
            result = await callGemini(nextMessages, ctx, true);
          } else if (
            firstAttemptError instanceof Error &&
            firstAttemptError.message.includes('payload')
          ) {
            result = await callGemini(nextMessages, ctx, true);
          } else {
            throw firstAttemptError;
          }
        }

        setLastPayload(result.payload);
        setMessages([
          ...nextMessages,
          { role: 'model', parts: [{ text: result.modelText }] },
        ]);
      } catch (caughtError) {
        setMessages(beforeSend);
        const message =
          caughtError instanceof Error
            ? caughtError.message
            : 'Couldn\'t understand that response. Please try again.';
        setError(message);
      } finally {
        setLoading(false);
      }
    },
    [ctx, loading, messages],
  );

  const clear = useCallback(() => {
    setMessages([]);
    setError(null);
    setLastPayload(null);
    setLoading(false);
    lastUserTextRef.current = null;
  }, []);

  const retry = useCallback(async () => {
    if (!lastUserTextRef.current || loading) return;
    await send(lastUserTextRef.current);
  }, [loading, send]);

  return { messages, loading, error, lastPayload, send, clear, retry, chips };
}

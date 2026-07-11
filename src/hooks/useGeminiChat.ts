/// <reference types="vite/client" />
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
  connector?: {
    fromId: string;
    toId: string;
    createIfMissing?: boolean;
  };
  fromId?: string;
  toId?: string;
  flowFromId?: string;
  flowToId?: string;
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

export interface MissionResponse {
  type: 'mission';
  id: string;
  title: string;
  goal: string;
  fromId: string;
  toId: string;
  hint: string;
}

export interface DecisionResponse {
  type: 'decision';
  mode: 'high-load' | 'packet-loss' | 'cable-cut';
  question: string;
  options: Array<{
    id: string;
    label: string;
    description: string;
  }>;
  recommended: string;
  why: string;
}

export type GeminiPayload =
  | JourneyResponse
  | ExplainResponse
  | ScenarioResponse
  | FactResponse
  | ActionResponse
  | MissionResponse
  | DecisionResponse;

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
  'gemini-2.5-flash';

const FALLBACK_GEMINI_MODELS = [
  'gemini-2.5-flash-lite',
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
];

const GEMINI_REQUEST_TIMEOUT_MS = 8000;

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

function normalizeText(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function findTermIndex(haystack: string, term: string): number {
  const normalizedTerm = normalizeText(term);
  if (!normalizedTerm) return -1;
  const pattern = escapeRegex(normalizedTerm).replace(/\s+/g, '\\s+');
  const matcher = new RegExp(`(^|[^a-z0-9])${pattern}(?=$|[^a-z0-9])`);
  const match = matcher.exec(haystack);
  if (!match || match.index < 0) return -1;
  const boundaryLength = match[1]?.length ?? 0;
  return match.index + boundaryLength;
}

function inferScenarioConnectorFromStory(story: string): { fromId: string; toId: string } | null {
  const normalizedStory = normalizeText(story);
  if (!normalizedStory) return null;

  const candidatePositions = new Map<string, number>();
  const mark = (cityId: string, index: number) => {
    if (index < 0) return;
    const current = candidatePositions.get(cityId);
    if (current === undefined || index < current) {
      candidatePositions.set(cityId, index);
    }
  };

  CITIES.forEach((city) => {
    mark(city.id, findTermIndex(normalizedStory, city.name));
    mark(city.id, findTermIndex(normalizedStory, city.id));
  });

  const noisyAliases = new Set(['us', 'uk', 'la', 'sg']);
  Object.entries(CITY_ALIASES).forEach(([alias, cityId]) => {
    const normalizedAlias = normalizeText(alias);
    if (normalizedAlias.length < 3 || noisyAliases.has(normalizedAlias)) return;
    mark(cityId, findTermIndex(normalizedStory, normalizedAlias));
  });

  const ranked = Array.from(candidatePositions.entries())
    .sort((a, b) => a[1] - b[1])
    .map(([cityId]) => cityId);

  if (ranked.length < 2 || ranked[0] === ranked[1]) return null;
  return { fromId: ranked[0], toId: ranked[1] };
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
3) {"type":"scenario","mode":"high-load|packet-loss|cable-cut","connector":{"fromId":"cityId","toId":"cityId","createIfMissing":true},"fromId":"cityId","toId":"cityId","flowFromId":"cityId","flowToId":"cityId","story":"plain English narration with exactly 2 lines: What/Why"}
4) {"type":"fact","emoji":"...","content":"max 30 words"}
5) {"type":"action","action":"SET_MODE|FOCUS_CITY","payload":"mode or cityId","message":"plain English narration"}
6) {"type":"mission","id":"unique mission id","title":"mission name","goal":"mission objective in plain English","fromId":"source cityId","toId":"destination cityId","hint":"helpful hint for the user"}
7) {"type":"decision","mode":"high-load|packet-loss|cable-cut","question":"user choice question","options":[{"id":"option1","label":"emoji Option 1","description":"brief"},{"id":"option2","label":"emoji Option 2","description":"brief"}],"recommended":"option1","why":"why this is better"}`;

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
      'For simulation requests, ALWAYS use type "scenario" and include connector {fromId,toId,createIfMissing:true} with two different valid city IDs. Also mirror them into fromId + toId + flowFromId + flowToId.',
      'Choose a random city pair for every simulation response.',
      'For scenario.story, use exactly 2 lines with these labels: "What you see on map:", "Why it happens:".',
      'In "What you see on map", describe only visible route behavior on the globe (dots, rings, route status).',
      'In "Why it happens" for high-load mode, describe route-level congestion only: one path is saturated, office-hour cloud traffic, CDN cache misses, a peering bottleneck, maintenance reducing capacity, or a regional ISP overload. Do not mention worldwide game launches, global live streams, viral social surges, or OS updates unless the user explicitly asks for a global traffic spike.',
      'In "Why it happens" for other modes, mention at least 2 realistic causes.',
      'Use plain English only. If you use "packet", immediately explain it as "small pieces of data".',
      'If user commands to change simulation or focus on a city, use type "action".',
      '--- Specific Topic Guidance ---',
      '1. "How internet works": Explain it is a collection of billions of computers. Data travels at the speed of light through fiber optics. Data is broken into packets and passes through internet layers.',
      '2. "Important components of internet": Provide a tidy, organized list (Servers, Routers, Fiber Cables, IXPs, Protocols).',
      '3. "History about internet": Mention ARPANET, TCP/IP, and the World Wide Web.',
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
    'For simulation requests (high-load, packet-loss, cable-cut), ALWAYS use type "scenario" and include connector {fromId,toId,createIfMissing:true} plus fromId + toId + flowFromId + flowToId using two different valid city IDs.',
    'Choose a random city pair for each simulation response.',
    'For scenario responses, story must be exactly 2 short lines with these labels: "What you see on map:", "Why it happens:".',
    'In "What you see on map", describe only what is visible on the globe for the selected route and nodes.',
    'In "Why it happens", mention at least 2 realistic, specific causes for the selected mode.',
    '',
    '--- Mode-specific guidance ---',
    'When mode is high-load:',
    '  - Treat normal high-load simulation as a route traffic jam, not a global traffic spike.',
    '  - In the "Why it happens" line, use 2 route-level causes: one link is saturated, office-hour cloud traffic, CDN cache misses, a peering bottleneck, maintenance reducing capacity, regional ISP overload, or nearby cloud-region spillover.',
    '  - Do not mention worldwide game launches, global live streams, viral social surges, streaming premieres, or OS updates for route traffic jam.',
    '  - Visual cues: dense moving dots, route highlight, pulsing rings on both route nodes',
    '',
    'When mode is packet-loss:',
    '  - Causes: weak WiFi or cellular signal, electrical interference near cables, network congestion causing drops, damaged fiber link',
    '  - Always explain "packet" as "small piece of data"',
    '  - Visual cues: moving dots stop at retry point (↺), then restart on the same route',
    '',
    'When mode is cable-cut:',
    '  - Causes: ship anchor damage (most common), undersea earthquake, construction accident, hurricane/storm damage, maintenance error',
    '  - Visual cues: selected route marked with large X and traffic stops on that route',
    '',
    'For SET_MODE action responses, message must include only "What you see on map" and "Why it happens" in plain English.',
    'Avoid unexplained jargon. Prefer simple words and short sentences.',
    'If a city is mentioned with an alias, map it to the city ID from the alias map.',
    'If user commands to change the simulation mode or look at a city, use type "action" to trigger UI change.',
    '',
    '--- Specific Topic Guidance ---',
    'When asked "How internet works":',
    '  - Explain the paradigm: the internet is a massive web of computers talking to each other.',
    '  - Detail how data travels at the speed of light through undersea and underground fiber optic cables.',
    '  - Explain that data is split into "packets" (small pieces) which travel through different layers of the internet to find their way.',
    '  - For this specific question, you may exceed the usual word limit (up to 150 words) to ensure high detail.',
    '',
    'When asked "What are the important components of internet?":',
    '  - Provide a tidy, organized overview of essential parts.',
    '  - Include Physical: (Servers, Fiber Cables, Routers) and Logical: (IP addresses, Protocols).',
    '',
    'When asked "Tell me history about internet":',
    '  - Mention ARPANET (the first network), the adoption of TCP/IP (the language of the web), and the creation of the World Wide Web.',
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

    return payload as unknown as JourneyResponse;
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
    return payload as unknown as ExplainResponse;
  }

  if (payload.type === 'scenario') {
    const hasFrom = payload.fromId !== undefined;
    const hasTo = payload.toId !== undefined;
    const hasConnector = payload.connector !== undefined;
    const hasFlowFrom = payload.flowFromId !== undefined;
    const hasFlowTo = payload.flowToId !== undefined;
    if (
      (payload.mode !== 'high-load' &&
        payload.mode !== 'packet-loss' &&
        payload.mode !== 'cable-cut') ||
      typeof payload.story !== 'string' ||
      (hasFrom && typeof payload.fromId !== 'string') ||
      (hasTo && typeof payload.toId !== 'string') ||
      (hasFlowFrom && typeof payload.flowFromId !== 'string') ||
      (hasFlowTo && typeof payload.flowToId !== 'string') ||
      (hasConnector &&
        (typeof payload.connector !== 'object' || payload.connector === null)) ||
      hasFrom !== hasTo ||
      hasFlowFrom !== hasFlowTo
    ) {
      throw new Error('Invalid scenario payload');
    }

    let connector:
      | {
          fromId: string;
          toId: string;
          createIfMissing: boolean;
        }
      | undefined;

    if (hasConnector) {
      const connectorPayload = payload.connector as Record<string, unknown>;
      if (
        typeof connectorPayload.fromId !== 'string' ||
        typeof connectorPayload.toId !== 'string' ||
        (connectorPayload.createIfMissing !== undefined &&
          typeof connectorPayload.createIfMissing !== 'boolean')
      ) {
        throw new Error('Invalid scenario connector payload');
      }

      const normalizedConnectorFrom = resolveCityId(connectorPayload.fromId);
      const normalizedConnectorTo = resolveCityId(connectorPayload.toId);
      if (
        normalizedConnectorFrom &&
        normalizedConnectorTo &&
        normalizedConnectorFrom !== normalizedConnectorTo
      ) {
        connector = {
          fromId: normalizedConnectorFrom,
          toId: normalizedConnectorTo,
          createIfMissing: connectorPayload.createIfMissing !== false,
        };
      }
    }

    if (hasFrom && hasTo) {
      const normalizedFrom = resolveCityId(payload.fromId as string);
      const normalizedTo = resolveCityId(payload.toId as string);
      if (
        !connector &&
        normalizedFrom &&
        normalizedTo &&
        normalizedFrom !== normalizedTo
      ) {
        connector = {
          fromId: normalizedFrom,
          toId: normalizedTo,
          createIfMissing: true,
        };
      }
    }

    if (!connector) {
      const inferredFromStory = inferScenarioConnectorFromStory(payload.story as string);
      if (inferredFromStory) {
        connector = {
          fromId: inferredFromStory.fromId,
          toId: inferredFromStory.toId,
          createIfMissing: true,
        };
      }
    }

    let flowFromId: string | null = null;
    let flowToId: string | null = null;
    if (hasFlowFrom && hasFlowTo) {
      flowFromId = resolveCityId(payload.flowFromId as string) ?? null;
      flowToId = resolveCityId(payload.flowToId as string) ?? null;
    }
    if (connector && (!flowFromId || !flowToId)) {
      flowFromId = connector.fromId;
      flowToId = connector.toId;
    }

    if (connector) {
      return {
        type: 'scenario',
        mode: payload.mode as ScenarioResponse['mode'],
        connector,
        fromId: connector.fromId,
        toId: connector.toId,
        flowFromId: flowFromId ?? undefined,
        flowToId: flowToId ?? undefined,
        story: payload.story as string,
      };
    }

    return {
      type: 'scenario',
      mode: payload.mode as ScenarioResponse['mode'],
      story: payload.story as string,
    };
  }

  if (payload.type === 'fact') {
    if (typeof payload.emoji !== 'string' || typeof payload.content !== 'string') {
      throw new Error('Invalid fact payload');
    }
    return payload as unknown as FactResponse;
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

    return payload as unknown as ActionResponse;
  }

  if (payload.type === 'mission') {
    if (
      typeof payload.id !== 'string' ||
      typeof payload.title !== 'string' ||
      typeof payload.goal !== 'string' ||
      typeof payload.fromId !== 'string' ||
      typeof payload.toId !== 'string' ||
      typeof payload.hint !== 'string'
    ) {
      throw new Error('Invalid mission payload');
    }
    return payload as unknown as MissionResponse;
  }

  if (payload.type === 'decision') {
    if (
      !['high-load', 'packet-loss', 'cable-cut'].includes(payload.mode as string) ||
      typeof payload.question !== 'string' ||
      !Array.isArray(payload.options) ||
      payload.options.length < 2 ||
      typeof payload.recommended !== 'string' ||
      typeof payload.why !== 'string'
    ) {
      throw new Error('Invalid decision payload');
    }
    const opts = payload.options as Array<{ id: string; label: string; description: string }>;
    if (!opts.every(opt => typeof opt.id === 'string' && typeof opt.label === 'string' && typeof opt.description === 'string')) {
      throw new Error('Invalid decision options');
    }
    return payload as unknown as DecisionResponse;
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

const FALLBACK_GEMINI_STATUSES = new Set([404, 429, 500, 502, 503, 504]);

async function fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), GEMINI_REQUEST_TIMEOUT_MS);

  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    window.clearTimeout(timeout);
  }
}

function shouldTryNextGeminiModel(status: number): boolean {
  return FALLBACK_GEMINI_STATUSES.has(status);
}

async function callGemini(
  messages: ChatMessage[],
  ctx: GeminiChatContext,
  simplifiedPrompt: boolean,
): Promise<{ payload: GeminiPayload; modelText: string }> {
  const apiKey = (import.meta.env.VITE_GEMINI_API_KEY as string | undefined) || 'MYPAAS_GEMINI_API_KEY_PLACEHOLDER';
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

  const modelsToTry = Array.from(new Set([PRIMARY_GEMINI_MODEL, ...FALLBACK_GEMINI_MODELS]));
  let response: Response | null = null;
  let lastStatus: number | null = null;

  for (const model of modelsToTry) {
    try {
      response = await fetchWithTimeout(`${modelUrl(model)}?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: requestBody,
      });
      lastStatus = response.status;
    } catch (caughtError) {
      if (caughtError instanceof DOMException && caughtError.name === 'AbortError') {
        lastStatus = 504;
        continue;
      }
      throw caughtError;
    }

    if (response?.ok) {
      break;
    }

    if (response && !shouldTryNextGeminiModel(response.status)) {
      break;
    }
  }

  if (!response) {
    throw new Error('Could not reach the AI guide right now. Please try again.');
  }

  if (!response.ok) {
    let retryMessage = 'Could not reach the AI guide right now. Please try again.';
    if (lastStatus === 429) {
      retryMessage = 'The AI guide hit the free quota limit. Please wait a minute and try again.';
    } else if (lastStatus === 503) {
      retryMessage = 'The AI model is overloaded right now. I tried fallback models too; please retry in a bit.';
    } else if (lastStatus === 504) {
      retryMessage = 'The AI guide took too long to respond. Please retry in a moment.';
    } else if (lastStatus && lastStatus >= 500) {
      retryMessage = 'The AI provider is having a temporary server issue. Please retry in a bit.';
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
          { role: 'model', parts: [{ text: JSON.stringify(result.payload) }] },
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

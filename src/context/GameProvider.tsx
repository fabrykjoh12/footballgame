import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type {
  ConnectionState,
  GameEvent,
  MatchSettings,
  Player,
  Room,
  ServiceMode,
  SubmitAnswerInput,
} from '../types/game';
import {
  createGameService,
  multiplayerAvailable,
  multiplayerProvider,
  type GameIntent,
  type GameService,
  type MultiplayerProvider,
} from '../services/gameService';
import { dailySettings } from '../lib/dailyChallenge';

interface GameContextValue {
  room: Room | null;
  localPlayerId: string;
  serviceMode: ServiceMode | null;
  multiplayerAvailable: boolean;
  multiplayerProvider: MultiplayerProvider;
  connecting: boolean;
  connectionState: ConnectionState;
  error: string | null;
  events: GameEvent[];

  localPlayer: Player | null;
  opponent: Player | null;
  isHost: boolean;

  createRoom: (name: string) => Promise<void>;
  joinRoom: (code: string, name: string) => Promise<void>;
  playDemo: (name: string) => Promise<void>;
  playDaily: (name: string) => Promise<void>;
  updateSettings: (settings: Partial<MatchSettings>) => Promise<void>;
  startMatch: () => Promise<void>;
  submitAnswer: (input: SubmitAnswerInput) => Promise<void>;
  nextQuestion: () => Promise<void>;
  rematch: () => Promise<void>;
  leaveRoom: () => Promise<void>;
  /** Whether the active backend supports a shared pause. */
  canPause: boolean;
  pauseMatch: () => Promise<void>;
  resumeMatch: () => Promise<void>;
  clearEvent: (nonce: number) => void;
  clearError: () => void;
}

const GameContext = createContext<GameContextValue | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
  const [room, setRoom] = useState<Room | null>(null);
  const [localPlayerId, setLocalPlayerId] = useState('');
  const [serviceMode, setServiceMode] = useState<ServiceMode | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [connectionState, setConnectionState] = useState<ConnectionState>('connected');
  const [error, setError] = useState<string | null>(null);
  const [events, setEvents] = useState<GameEvent[]>([]);

  const serviceRef = useRef<GameService | null>(null);
  const unsubsRef = useRef<Array<() => void>>([]);

  const teardown = useCallback(() => {
    unsubsRef.current.forEach((fn) => fn());
    unsubsRef.current = [];
    serviceRef.current = null;
  }, []);

  const startSession = useCallback(
    async (intent: GameIntent, name: string, code?: string) => {
      // Clean up any previous session first.
      if (serviceRef.current) {
        try {
          await serviceRef.current.leaveRoom();
        } catch {
          /* noop */
        }
        teardown();
      }

      setError(null);
      setEvents([]);
      setRoom(null);
      setConnectionState('connected');
      setConnecting(true);

      const service = await createGameService(intent);
      serviceRef.current = service;
      setServiceMode(service.mode);

      unsubsRef.current.push(
        service.onRoomUpdate((r) => {
          setRoom(r);
          // Keep the local player id in sync as soon as it's known.
          const id = service.getLocalPlayerId();
          if (id) setLocalPlayerId(id);
        }),
      );
      unsubsRef.current.push(
        service.onEvent((e) => setEvents((prev) => [...prev, e].slice(-6))),
      );
      if (service.onConnectionState) {
        unsubsRef.current.push(service.onConnectionState(setConnectionState));
      }

      try {
        if (intent === 'join') {
          await service.joinRoom(code ?? '', name);
        } else {
          await service.createRoom(name);
        }
        setLocalPlayerId(service.getLocalPlayerId());
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Something went wrong.');
        teardown();
        setRoom(null);
        setServiceMode(null);
      } finally {
        setConnecting(false);
      }
    },
    [teardown],
  );

  const createRoom = useCallback(
    (name: string) => startSession('create', name),
    [startSession],
  );
  const joinRoom = useCallback(
    (code: string, name: string) => startSession('join', name, code),
    [startSession],
  );
  const playDemo = useCallback(
    (name: string) => startSession('demo', name),
    [startSession],
  );
  const playDaily = useCallback(
    async (name: string) => {
      await startSession('demo', name);
      // Fixed mode + today's seed → the same match for everyone, then kick off.
      await serviceRef.current?.updateSettings(dailySettings());
      await serviceRef.current?.startMatch();
    },
    [startSession],
  );

  const updateSettings = useCallback(async (settings: Partial<MatchSettings>) => {
    await serviceRef.current?.updateSettings(settings);
  }, []);
  const startMatch = useCallback(async () => {
    await serviceRef.current?.startMatch();
  }, []);
  const submitAnswer = useCallback(async (input: SubmitAnswerInput) => {
    await serviceRef.current?.submitAnswer(input);
  }, []);
  const nextQuestion = useCallback(async () => {
    await serviceRef.current?.nextQuestion();
  }, []);
  const rematch = useCallback(async () => {
    await serviceRef.current?.rematch();
  }, []);
  const pauseMatch = useCallback(async () => {
    await serviceRef.current?.pause?.();
  }, []);
  const resumeMatch = useCallback(async () => {
    await serviceRef.current?.resume?.();
  }, []);

  const leaveRoom = useCallback(async () => {
    try {
      await serviceRef.current?.leaveRoom();
    } catch {
      /* noop */
    }
    teardown();
    setRoom(null);
    setServiceMode(null);
    setLocalPlayerId('');
    setEvents([]);
    setError(null);
    setConnectionState('connected');
  }, [teardown]);

  const clearEvent = useCallback((nonce: number) => {
    setEvents((prev) => prev.filter((e) => e.nonce !== nonce));
  }, []);
  const clearError = useCallback(() => setError(null), []);

  const localPlayer = useMemo(
    () => room?.players.find((p) => p.id === localPlayerId) ?? null,
    [room, localPlayerId],
  );
  const opponent = useMemo(
    () => room?.players.find((p) => p.id !== localPlayerId) ?? null,
    [room, localPlayerId],
  );
  const isHost = Boolean(localPlayer?.isHost);
  const canPause = Boolean(serviceRef.current?.pause);

  const value: GameContextValue = {
    room,
    localPlayerId,
    serviceMode,
    multiplayerAvailable,
    multiplayerProvider,
    connecting,
    connectionState,
    error,
    events,
    localPlayer,
    opponent,
    isHost,
    createRoom,
    joinRoom,
    playDemo,
    playDaily,
    updateSettings,
    startMatch,
    submitAnswer,
    nextQuestion,
    rematch,
    leaveRoom,
    canPause,
    pauseMatch,
    resumeMatch,
    clearEvent,
    clearError,
  };

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame(): GameContextValue {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used within a GameProvider');
  return ctx;
}

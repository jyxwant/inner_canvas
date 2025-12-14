
export interface Coordinate {
  x: number;
  y: number;
}

export interface ViewState {
  x: number;
  y: number;
  scale: number;
}

export interface NodeData {
  id: string;
  x: number;
  y: number;
  title: string;
  insight: string;
  visualKeyword: string; // Used for prompt
  imageUrl?: string; // Base64 data or URL
  isLoadingImage?: boolean;
  parentId?: string;
}

export interface EdgeData {
  id: string;
  sourceId: string;
  targetId: string;
  label?: string;
}

export interface ProfilingOption {
  id: string;
  label: string; // e.g., "Drowning"
  description: string; // e.g., "Feeling submerged and unable to breathe"
  visualKeyword: string; // The prompt to use if selected
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: number;
  options?: ProfilingOption[]; // Interactive choices for the user
  optionsHeader?: string; // Dynamic label for the options section (e.g. "Select a Theory")
}

export type Language = 'en' | 'zh' | 'ja' | 'ko' | 'es' | 'fr';

export interface CanvasState {
  nodes: NodeData[];
  edges: EdgeData[];
  view: ViewState;
  selectedNodeIds: string[]; // Changed to array for multi-selection
  isThinking: boolean;
  chatHistory: ChatMessage[];
  isSpeaking: boolean;
  isMusicOn: boolean;
  language: Language;
}

export enum ActionType {
  PAN = 'PAN',
  ZOOM = 'ZOOM',
  SET_VIEW = 'SET_VIEW',
  ADD_NODE = 'ADD_NODE',
  UPDATE_NODE_DATA = 'UPDATE_NODE_DATA',
  SET_SELECTION = 'SET_SELECTION', // Changed from SELECT_NODE
  SET_THINKING = 'SET_THINKING',
  UPDATE_NODE_POS = 'UPDATE_NODE_POS',
  ADD_CHAT_MESSAGE = 'ADD_CHAT_MESSAGE',
  SET_SPEAKING = 'SET_SPEAKING',
  SET_MUSIC = 'SET_MUSIC',
  SET_LANGUAGE = 'SET_LANGUAGE',
}

export type CanvasAction =
  | { type: ActionType.PAN; payload: Coordinate }
  | { type: ActionType.ZOOM; payload: { delta: number; center: Coordinate } }
  | { type: ActionType.SET_VIEW; payload: ViewState }
  | { type: ActionType.ADD_NODE; payload: { node: NodeData; edge?: EdgeData } }
  | { type: ActionType.UPDATE_NODE_DATA; payload: { id: string; data: Partial<NodeData> } }
  | { type: ActionType.SET_SELECTION; payload: string[] }
  | { type: ActionType.SET_THINKING; payload: boolean }
  | { type: ActionType.UPDATE_NODE_POS; payload: { id: string; x: number; y: number } }
  | { type: ActionType.ADD_CHAT_MESSAGE; payload: ChatMessage }
  | { type: ActionType.SET_SPEAKING; payload: boolean }
  | { type: ActionType.SET_MUSIC; payload: boolean }
  | { type: ActionType.SET_LANGUAGE; payload: Language };

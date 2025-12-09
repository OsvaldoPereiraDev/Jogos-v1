export interface Message {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: number;
  isLoading?: boolean;
  type?: 'text' | 'image_analysis' | 'football_analysis';
  images?: string[]; // base64 strings
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
}

export interface AnalysisConfig {
  startDate: string;
  endDate: string;
  strategy: BettingStrategy;
  leagues: string;
}

export enum ModelType {
  FLASH = 'gemini-2.5-flash',
  PRO = 'gemini-3-pro-preview',
}

export enum BettingStrategy {
  CONSERVATIVE = 'conservadora', // High strike rate, lower odds
  VALUE = 'valor', // Higher odds, value betting
}
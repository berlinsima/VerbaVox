export enum TranscriptionStatus {
  PENDING = 'PENDING',
  TRANSCRIBING = 'TRANSCRIBING',
  TRANSLATED = 'TRANSLATED',
  SUMMARIZED = 'SUMMARIZED',
  COMPLETED = 'COMPLETED',
  ERROR = 'ERROR',
}

export interface Language {
  code: string;
  name: string;
}

export interface ScriptQuote {
  speaker: string;
  quote: string;
}

export interface ProcessedFileState {
  file: File;
  status: TranscriptionStatus;
  transcript: string | null;
  translation: string | null;
  script: ScriptQuote[] | null;
  error: string | null;
}
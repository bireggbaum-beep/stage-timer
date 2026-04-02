export type SegmentMode = 'auto' | 'manual';

export interface Segment {
  id: string;
  title: string;
  durationMinutes: number; // Can be decimal after smart compensate
  durationSeconds?: number; // Precise duration in seconds
  actualDurationSeconds?: number; // Actual duration during session
  mode: SegmentMode;
}

export interface TimerState {
  segments: Segment[];
  currentSegmentIndex: number;
  isRunning: boolean;
  isPaused: boolean;
  elapsedSeconds: number;
  overtimeSeconds: number;
  showClock: boolean;
  totalPauseSeconds: number;
  totalOvertimeSeconds: number;
  plannedEndTime: string | null; // HH:MM format
  sessionCompleted: boolean;
  sessionStartTime: Date | null;
}

export interface AirtableTemplate {
  id: string;         // Airtable record ID
  name: string;       // Template name
  segments: Segment[];// Parsed from JSON
  created: string;    // ISO timestamp
}

export interface TimerConfig {
  segments: Segment[];
}


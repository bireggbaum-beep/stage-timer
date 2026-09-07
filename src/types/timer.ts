export type SegmentMode = 'auto' | 'manual';

export const SEGMENT_COLORS = [
  '#7c3aed', '#3b82f6', '#06b6d4', '#22c55e', '#eab308', '#f97316', '#ef4444', '#ec4899', '#8b5cf6', '#6b7280',
] as const;

export type SegmentColor = string;

export interface Segment {
  id: string;
  title: string;
  durationMinutes: number; // Can be decimal after smart compensate
  durationSeconds?: number; // Precise duration in seconds
  actualDurationSeconds?: number; // Actual duration during session
  mode: SegmentMode;
  color?: SegmentColor;
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
  waitAtSegmentEnd: boolean; // Pomodoro: halt at every segment boundary and wait for the user
  awaitingContinue: boolean; // true while stopped at a boundary, waiting for "Start"
  boundarySignal: number; // increments on each natural segment completion (drives the transition chime)
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


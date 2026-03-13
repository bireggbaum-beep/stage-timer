import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { Segment, TimerState } from '@/types/timer';

interface TimerContextType {
  state: TimerState;
  startTimer: () => void;
  pauseTimer: () => void;
  resetTimer: () => void;
  nextSegment: () => void;
  previousSegment: () => void;
  toggleClock: () => void;
  setSegments: (segments: Segment[]) => void;
  getProjectedEndTime: () => Date;
  getRemainingTotalSeconds: () => number;
  getCurrentSegmentProgress: () => number;
  addToPauseTime: (seconds: number) => void;
  setPlannedEndTime: (time: string | null) => void;
  extendPlannedEndTime: (minutes: number) => void;
  smartCompensate: () => void;
  endSession: () => void;
  isLastSegment: () => boolean;
}

const TimerContext = createContext<TimerContextType | undefined>(undefined);

export function TimerProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<TimerState>(() => {
    const saved = localStorage.getItem('timerState');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return getInitialState();
      }
    }
    return getInitialState();
  });

  const intervalRef = useRef<number | null>(null);

  function getInitialState(): TimerState {
    return {
      segments: [],
      currentSegmentIndex: 0,
      isRunning: false,
      isPaused: false,
      elapsedSeconds: 0,
      overtimeSeconds: 0,
      showClock: false,
      totalPauseSeconds: 0,
      totalOvertimeSeconds: 0,
      plannedEndTime: null,
      sessionCompleted: false,
      sessionStartTime: null,
    };
  }

  // Save state to localStorage
  useEffect(() => {
    localStorage.setItem('timerState', JSON.stringify(state));
  }, [state]);

  // Timer tick logic
  useEffect(() => {
    if (state.isRunning && !state.isPaused && state.segments.length > 0) {
      intervalRef.current = window.setInterval(() => {
        setState((prev) => {
          const currentSegment = prev.segments[prev.currentSegmentIndex];
          if (!currentSegment) return prev;

          const segmentDurationSeconds = currentSegment.durationMinutes * 60;
          const newElapsed = prev.elapsedSeconds + 1;

          // Check if segment is complete
          if (newElapsed >= segmentDurationSeconds) {
            // Auto mode: move to next segment
            if (currentSegment.mode === 'auto') {
              if (prev.currentSegmentIndex < prev.segments.length - 1) {
                return {
                  ...prev,
                  currentSegmentIndex: prev.currentSegmentIndex + 1,
                  elapsedSeconds: 0,
                  overtimeSeconds: 0,
                  totalOvertimeSeconds: prev.totalOvertimeSeconds + prev.overtimeSeconds,
                };
              } else {
                // Last segment finished - continue running to show overtime
                return {
                  ...prev,
                  elapsedSeconds: newElapsed,
                  overtimeSeconds: prev.overtimeSeconds + 1,
                };
              }
            } else {
              // Manual mode: count overtime
              return {
                ...prev,
                elapsedSeconds: newElapsed,
                overtimeSeconds: prev.overtimeSeconds + 1,
              };
            }
          }

          return {
            ...prev,
            elapsedSeconds: newElapsed,
          };
        });
      }, 1000);

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }
  }, [state.isRunning, state.isPaused, state.segments]);

  const startTimer = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isRunning: true,
      isPaused: false,
    }));
  }, []);

  const pauseTimer = useCallback(() => {
    setState((prev) => {
      // If we're resuming from pause, we need to capture the pause duration
      // This will be handled by the Timer component via a ref
      return {
        ...prev,
        isPaused: !prev.isPaused,
      };
    });
  }, []);

  const addToPauseTime = useCallback((seconds: number) => {
    setState((prev) => ({
      ...prev,
      totalPauseSeconds: prev.totalPauseSeconds + seconds,
    }));
  }, []);

  const setPlannedEndTime = useCallback((time: string | null) => {
    setState((prev) => ({
      ...prev,
      plannedEndTime: time,
    }));
  }, []);

  const extendPlannedEndTime = useCallback((minutes: number) => {
    setState((prev) => {
      if (!prev.plannedEndTime) return prev;
      
      const [hours, mins] = prev.plannedEndTime.split(':').map(Number);
      const date = new Date();
      date.setHours(hours, mins + minutes, 0, 0);
      
      const newTime = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
      
      return {
        ...prev,
        plannedEndTime: newTime,
      };
    });
  }, []);



  const resetTimer = useCallback(() => {
    setState((prev) => ({
      ...prev,
      currentSegmentIndex: 0,
      isRunning: false,
      isPaused: false,
      elapsedSeconds: 0,
      overtimeSeconds: 0,
      totalPauseSeconds: 0,
      totalOvertimeSeconds: 0,
    }));
  }, []);

  const nextSegment = useCallback(() => {
    setState((prev) => {
      if (prev.currentSegmentIndex < prev.segments.length - 1) {
        return {
          ...prev,
          currentSegmentIndex: prev.currentSegmentIndex + 1,
          elapsedSeconds: 0,
          overtimeSeconds: 0,
          totalOvertimeSeconds: prev.totalOvertimeSeconds + prev.overtimeSeconds,
        };
      }
      return prev;
    });
  }, []);

  const previousSegment = useCallback(() => {
    setState((prev) => {
      if (prev.currentSegmentIndex > 0) {
        return {
          ...prev,
          currentSegmentIndex: prev.currentSegmentIndex - 1,
          elapsedSeconds: 0,
          overtimeSeconds: 0,
        };
      }
      return prev;
    });
  }, []);

  const toggleClock = useCallback(() => {
    setState((prev) => ({
      ...prev,
      showClock: !prev.showClock,
    }));
  }, []);

  const setSegments = useCallback((segments: Segment[]) => {
    setState((prev) => ({
      ...prev,
      segments,
      currentSegmentIndex: 0,
      isRunning: false,
      isPaused: false,
      elapsedSeconds: 0,
      overtimeSeconds: 0,
    }));
  }, []);

  const getProjectedEndTime = useCallback((): Date => {
    const now = new Date();
    let totalRemainingSeconds = 0;

    // Add remaining time of current segment
    if (state.segments[state.currentSegmentIndex]) {
      const currentSegment = state.segments[state.currentSegmentIndex];
      const segmentDurationSeconds = currentSegment.durationSeconds || (currentSegment.durationMinutes * 60);
      const remainingInCurrent = segmentDurationSeconds - state.elapsedSeconds;
      totalRemainingSeconds += Math.max(0, remainingInCurrent);
    }

    // Add all future segments
    for (let i = state.currentSegmentIndex + 1; i < state.segments.length; i++) {
      const segment = state.segments[i];
      totalRemainingSeconds += segment.durationSeconds || (segment.durationMinutes * 60);
    }

    // Add current overtime if in overtime (delays end time)
    if (state.overtimeSeconds > 0) {
      totalRemainingSeconds += state.overtimeSeconds;
    }

    // Add total accumulated overtime from previous segments (delays end time)
    if (state.totalOvertimeSeconds > 0) {
      totalRemainingSeconds += state.totalOvertimeSeconds;
    }

    // Add total pause time (delays end time)
    if (state.totalPauseSeconds > 0) {
      totalRemainingSeconds += state.totalPauseSeconds;
    }

    return new Date(now.getTime() + totalRemainingSeconds * 1000);
  }, [state]);

  const getRemainingTotalSeconds = useCallback((): number => {
    let totalRemainingSeconds = 0;

    // Add remaining time of current segment
    if (state.segments[state.currentSegmentIndex]) {
      const currentSegment = state.segments[state.currentSegmentIndex];
      const segmentDurationSeconds = currentSegment.durationSeconds || (currentSegment.durationMinutes * 60);
      const remainingInCurrent = segmentDurationSeconds - state.elapsedSeconds;
      totalRemainingSeconds += Math.max(0, remainingInCurrent);
    }

    // Add all future segments
    for (let i = state.currentSegmentIndex + 1; i < state.segments.length; i++) {
      const segment = state.segments[i];
      totalRemainingSeconds += segment.durationSeconds || (segment.durationMinutes * 60);
    }

    return totalRemainingSeconds;
  }, [state]);

  const getCurrentSegmentProgress = useCallback((): number => {
    if (!state.segments[state.currentSegmentIndex]) return 0;
    
    const currentSegment = state.segments[state.currentSegmentIndex];
    const segmentDurationSeconds = currentSegment.durationSeconds || (currentSegment.durationMinutes * 60);
    
    if (segmentDurationSeconds === 0) return 100;
    
    const progress = (state.elapsedSeconds / segmentDurationSeconds) * 100;
    return Math.min(progress, 100);
  }, [state]);

  const isLastSegment = useCallback((): boolean => {
    return state.currentSegmentIndex === state.segments.length - 1;
  }, [state.currentSegmentIndex, state.segments.length]);

  const endSession = useCallback(() => {
    setState(getInitialState());
  }, []);

  const smartCompensate = useCallback(() => {
    if (!state.plannedEndTime) return;

    // Parse planned end time
    const [plannedHours, plannedMinutes] = state.plannedEndTime.split(':').map(Number);
    const plannedDate = new Date();
    plannedDate.setHours(plannedHours, plannedMinutes, 0, 0);

    // Get projected end time
    const projectedDate = getProjectedEndTime();

    // Calculate difference in seconds
    const differenceSeconds = Math.floor((projectedDate.getTime() - plannedDate.getTime()) / 1000);

    if (differenceSeconds <= 0) return; // No need to compensate

    // Calculate total remaining time (current segment remaining + future segments)
    const currentSegment = state.segments[state.currentSegmentIndex];
    if (!currentSegment) return;

    const segmentDurationSeconds = currentSegment.durationSeconds || (currentSegment.durationMinutes * 60);
    const currentRemainingSeconds = segmentDurationSeconds - state.elapsedSeconds;
    let totalRemainingSeconds = Math.max(0, currentRemainingSeconds);

    for (let i = state.currentSegmentIndex + 1; i < state.segments.length; i++) {
      const segment = state.segments[i];
      totalRemainingSeconds += segment.durationSeconds || (segment.durationMinutes * 60);
    }

    if (totalRemainingSeconds === 0) return;

    // Calculate reduction factor
    const reductionFactor = differenceSeconds / totalRemainingSeconds;

    // Apply proportional reduction to all remaining segments
    const newSegments = state.segments.map((segment, index) => {
      if (index < state.currentSegmentIndex) {
        // Past segments: no change
        return segment;
      } else if (index === state.currentSegmentIndex) {
        // Current segment: reduce based on remaining time
        const reducedSeconds = Math.floor(currentRemainingSeconds * (1 - reductionFactor));
        const elapsedSeconds = segmentDurationSeconds - currentRemainingSeconds;
        const newDurationSeconds = Math.max(60, elapsedSeconds + reducedSeconds);
        return {
          ...segment,
          durationSeconds: newDurationSeconds,
          durationMinutes: newDurationSeconds / 60,
        };
      } else {
        // Future segments: reduce proportionally
        const originalSeconds = segment.durationMinutes * 60;
        const reducedSeconds = Math.floor(originalSeconds * (1 - reductionFactor));
        const newDurationSeconds = Math.max(60, reducedSeconds);
        return {
          ...segment,
          durationSeconds: newDurationSeconds,
          durationMinutes: newDurationSeconds / 60,
        };
      }
    });

    setState((prev) => ({
      ...prev,
      segments: newSegments,
      totalPauseSeconds: 0,
      totalOvertimeSeconds: 0,
      overtimeSeconds: 0,
    }));
  }, [state, getProjectedEndTime]);

  return (
    <TimerContext.Provider
      value={{
        state,
        startTimer,
        pauseTimer,
        resetTimer,
        nextSegment,
        previousSegment,
        toggleClock,
        setSegments,
        getProjectedEndTime,
        getRemainingTotalSeconds,
        getCurrentSegmentProgress,
        addToPauseTime,
        setPlannedEndTime,
        extendPlannedEndTime,
        smartCompensate,
        endSession,
        isLastSegment,
      }}
    >
      {children}
    </TimerContext.Provider>
  );
}

export function useTimer() {
  const context = useContext(TimerContext);
  if (!context) {
    throw new Error('useTimer must be used within TimerProvider');
  }
  return context;
}


import { useEffect, useState, useRef } from 'react';
import { Button } from '@/components/ui/button';

import {
  Play,
  Pause,
  RotateCcw,
  ChevronRight,
  ChevronLeft,
  Clock,
  Settings,
  Maximize,
  List,
  Volume2,
  VolumeX,
  SkipForward,
  Hand,
} from 'lucide-react';
import { useTimer } from '@/contexts/TimerContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useLocation } from 'wouter';

export default function Timer() {
  const {
    state,
    startTimer,
    pauseTimer,
    resetTimer,
    nextSegment,
    previousSegment,
    toggleClock,
    getProjectedEndTime,
    getRemainingTotalSeconds,
    getCurrentSegmentProgress,
    addToPauseTime,
    extendPlannedEndTime,
    smartCompensate,
    endSession,
    isLastSegment,
    toggleCurrentSegmentMode,
  } = useTimer();
  const { t } = useLanguage();
  const [, setLocation] = useLocation();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showSegmentList, setShowSegmentList] = useState(true);
  const [fullscreenAvailable, setFullscreenAvailable] = useState(true);
  const [pauseDuration, setPauseDuration] = useState(0);
  const [tickingEnabled, setTickingEnabled] = useState<boolean>(() => {
    const stored = localStorage.getItem('tickingEnabled_v2');
    return stored === null ? true : stored === 'true';
  });
  const timelineRef = useRef<HTMLDivElement>(null);
  const wakeLockRef = useRef<any>(null);
  const pauseStartTimeRef = useRef<number | null>(null);
  // Web Audio API refs — seamless gapless looping at the sample level
  const audioCtxRef = useRef<AudioContext | null>(null);
  const audioBufferRef = useRef<AudioBuffer | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const playbackOffsetRef = useRef(0);
  const playbackStartRef = useRef(0);

  const playAudio = () => {
    const ctx = audioCtxRef.current;
    const buffer = audioBufferRef.current;
    if (!ctx || !buffer) return;
    if (ctx.state === 'suspended') ctx.resume();

    try { sourceRef.current?.stop(); } catch { /* already stopped */ }

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    source.connect(ctx.destination);
    source.start(0, playbackOffsetRef.current % buffer.duration);

    sourceRef.current = source;
    playbackStartRef.current = ctx.currentTime - playbackOffsetRef.current;
  };

  const pauseAudio = () => {
    const ctx = audioCtxRef.current;
    const buffer = audioBufferRef.current;
    if (!ctx || !sourceRef.current) return;

    playbackOffsetRef.current = buffer
      ? (ctx.currentTime - playbackStartRef.current) % buffer.duration
      : 0;

    try { sourceRef.current.stop(); } catch { /* already stopped */ }
    sourceRef.current = null;
  };

  const toggleTicking = () => {
    const next = !tickingEnabled;
    setTickingEnabled(next);
    localStorage.setItem('tickingEnabled_v2', String(next));
    if (next && state.isRunning && !state.isPaused) {
      playAudio();
    } else {
      pauseAudio();
    }
  };

  const handleStartPause = () => {
    if (!state.isRunning) {
      // Stopped → Start
      startTimer();
      if (tickingEnabled) playAudio();
    } else if (state.isPaused) {
      // Paused → Resume
      pauseTimer();
      if (tickingEnabled) playAudio();
    } else {
      // Running → Pause
      pauseTimer();
      pauseAudio();
    }
  };

  // Fetch and decode audio buffer on mount
  useEffect(() => {
    const ctx = new AudioContext();
    audioCtxRef.current = ctx;

    fetch(`${import.meta.env.BASE_URL}ticking.m4a`)
      .then((r) => r.arrayBuffer())
      .then((buf) => ctx.decodeAudioData(buf))
      .then((decoded) => { audioBufferRef.current = decoded; })
      .catch((err) => console.warn('Audio load:', err.message));

    return () => {
      try { sourceRef.current?.stop(); } catch { /* noop */ }
      ctx.close();
    };
  }, []);

  // Safety net: ensure audio is always paused when it should be.
  // Never calls play() — that is exclusively triggered by user gestures.
  useEffect(() => {
    if (!tickingEnabled || !state.isRunning || state.isPaused) {
      pauseAudio();
    }
  }, [tickingEnabled, state.isRunning, state.isPaused]);

  // Update current time every second
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Track pause duration (cumulative)
  useEffect(() => {
    if (state.isPaused && state.isRunning) {
      // Start tracking pause time
      if (!pauseStartTimeRef.current) {
        pauseStartTimeRef.current = Date.now();
        setPauseDuration(0);
      }
      
      const interval = setInterval(() => {
        if (pauseStartTimeRef.current) {
          const currentPauseDuration = Math.floor((Date.now() - pauseStartTimeRef.current) / 1000);
          setPauseDuration(currentPauseDuration);
        }
      }, 1000);
      
      return () => clearInterval(interval);
    } else if (pauseStartTimeRef.current !== null) {
      // When resuming, add current pause to total
      if (pauseDuration > 0) {
        addToPauseTime(pauseDuration);
      }
      pauseStartTimeRef.current = null;
      setPauseDuration(0);
    }
  }, [state.isPaused, state.isRunning]);

  // Auto-scroll timeline to center current segment
  useEffect(() => {
    if (showSegmentList && timelineRef.current) {
      const timeline = timelineRef.current;
      const activeSegment = timeline.querySelector(`[data-segment-index="${state.currentSegmentIndex}"]`);
      if (activeSegment) {
        setTimeout(() => {
          const timelineRect = timeline.getBoundingClientRect();
          const segmentRect = activeSegment.getBoundingClientRect();
          const scrollLeft = segmentRect.left - timelineRect.left - (timelineRect.width / 2) + (segmentRect.width / 2) + timeline.scrollLeft;
          timeline.scrollTo({ left: scrollLeft, behavior: 'smooth' });
        }, 100);
      }
    }
  }, [state.currentSegmentIndex, showSegmentList, state.segments.length]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        handleStartPause();
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        nextSegment();
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        previousSegment();
      } else if (e.code === 'KeyR' && e.ctrlKey) {
        e.preventDefault();
        resetTimer();
        pauseAudio();
      } else if (e.code === 'KeyF') {
        e.preventDefault();
        toggleFullscreen();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [state.isRunning, state.isPaused, tickingEnabled]);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (err) {
      console.error('Fullscreen error:', err);
      setFullscreenAvailable(false);
    }
  };

  // Check if fullscreen is available
  useEffect(() => {
    if (!document.fullscreenEnabled) {
      setFullscreenAvailable(false);
    }
  }, []);

  // Screen Wake Lock management
  const requestWakeLock = async () => {
    try {
      if ('wakeLock' in navigator) {
        const wakeLock = (navigator as any).wakeLock;
        wakeLockRef.current = await wakeLock.request('screen');
        console.log('Wake Lock activated');
      }
    } catch (err) {
      console.error('Wake Lock error:', err);
    }
  };

  const releaseWakeLock = async () => {
    if (wakeLockRef.current) {
      try {
        await wakeLockRef.current.release();
        wakeLockRef.current = null;
        console.log('Wake Lock released');
      } catch (err) {
        console.error('Wake Lock release error:', err);
      }
    }
  };

  // Activate wake lock when timer is running
  useEffect(() => {
    if (state.isRunning && !state.isPaused) {
      requestWakeLock();
    } else {
      releaseWakeLock();
    }

    // Cleanup on unmount
    return () => {
      releaseWakeLock();
    };
  }, [state.isRunning, state.isPaused]);

  // Re-acquire wake lock when page becomes visible again
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && state.isRunning && !state.isPaused) {
        requestWakeLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [state.isRunning, state.isPaused]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  if (state.segments.length === 0) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">{t('timer.noSegments')}</h2>
          <Button onClick={() => setLocation('/')}>{t('timer.toSetup')}</Button>
        </div>
      </div>
    );
  }

  const currentSegment = state.segments[state.currentSegmentIndex];
  const segmentDurationSeconds = currentSegment.durationSeconds || (currentSegment.durationMinutes * 60);
  const remainingSeconds = segmentDurationSeconds - state.elapsedSeconds;
  const isOvertime = remainingSeconds < 0;
  const displaySeconds = isOvertime ? state.overtimeSeconds : Math.max(0, remainingSeconds);

  const progress = getCurrentSegmentProgress();
  const progressColor = getProgressColor(progress, isOvertime);

  const remainingTotal = getRemainingTotalSeconds();
  const projectedEnd = getProjectedEndTime();

  function formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  function formatClock(date: Date): string {
    return date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  }

  function parsePlannedEndTime(timeString: string): Date {
    const [hours, minutes] = timeString.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    return date;
  }

  function getProgressColor(progress: number, overtime: boolean): string {
    if (overtime) return 'bg-[var(--timer-red)]';
    if (progress >= 90) return 'bg-[var(--timer-red)]';
    if (progress >= 75) return 'bg-[var(--timer-yellow)]';
    return 'bg-[var(--timer-green)]';
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Sticky header: progress bars always visible even when content scrolls */}
      <div className="sticky top-0 z-10">
      {/* Progress Bar - fixed gradient with shrinking overlay from left to right */}
      <div
        className="w-full h-6 relative overflow-hidden"
        style={{
          background: 'linear-gradient(to right, var(--timer-green) 0%, var(--timer-green) 75%, var(--timer-yellow) 75%, var(--timer-yellow) 90%, var(--timer-red) 90%, var(--timer-red) 100%)'
        }}
      >
        <div
          className="h-full bg-muted transition-all duration-300 absolute left-0"
          style={{ width: `${Math.min(progress, 100)}%` }}
        />
      </div>

      {/* Session Overview Bar - segmented visualization */}
      <div className="w-full h-2 bg-muted/30 flex">
        {state.segments.map((segment, index) => {
          const segmentDuration = segment.durationSeconds || (segment.durationMinutes * 60);
          const totalDuration = state.segments.reduce((sum, s) => sum + (s.durationSeconds || (s.durationMinutes * 60)), 0);
          const widthPercent = (segmentDuration / totalDuration) * 100;
          
          const isPast = index < state.currentSegmentIndex;
          const isCurrent = index === state.currentSegmentIndex;
          const isFuture = index > state.currentSegmentIndex;
          
          // Calculate progress within current segment
          let internalProgress = 0;
          if (isCurrent) {
            internalProgress = (state.elapsedSeconds / segmentDuration) * 100;
          }
          
          return (
            <div
              key={segment.id}
              className="relative h-full transition-all"
              style={{ width: `${widthPercent}%` }}
            >
              {/* Segment background */}
              <div
                className={`h-full ${
                  isPast
                    ? 'bg-muted/60'
                    : isCurrent
                    ? 'bg-primary/30'
                    : 'bg-muted/40'
                }`}
              />
              
              {/* Internal progress for current segment */}
              {isCurrent && (
                <div
                  className="absolute top-0 left-0 h-full bg-primary/60 transition-all duration-300"
                  style={{ width: `${Math.min(internalProgress, 100)}%` }}
                />
              )}
              
              {/* Segment separator */}
              {index < state.segments.length - 1 && (
                <div className="absolute right-0 top-0 w-0.5 h-full bg-foreground/30" />
              )}
            </div>
          );
        })}
      </div>
      </div>{/* end sticky header */}

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 md:p-8">
        {/* Segment Title */}
        <div className="text-center mb-4">
          <div className="text-sm text-muted-foreground mb-2">
            {t('timer.segment')} {state.currentSegmentIndex + 1} {t('common.of')} {state.segments.length}
          </div>
          <h1 className="text-4xl md:text-6xl font-bold">{currentSegment.title}</h1>
        </div>

        {/* Main Timer Display */}
        <div className="mb-3">
          <div
            className={`text-8xl md:text-[12rem] font-bold tabular-nums transition-colors ${
              isOvertime ? 'text-[var(--timer-red)] animate-pulse' : ''
            }`}
          >
            {isOvertime && '+'}
            {formatTime(displaySeconds)}
          </div>
          {/* Fixed height container to prevent vertical jumping */}
          <div className="min-h-[2rem] flex items-center justify-center mt-2">
            {isOvertime && (
              <div className="text-center text-base text-[var(--timer-red)]">{t('timer.overtime')}</div>
            )}
            {state.isPaused && state.isRunning && (
              <div className="text-center text-base text-[var(--timer-red)]">
                {t('timer.paused')} +{formatTime(state.totalPauseSeconds + pauseDuration)}
              </div>
            )}
            {!state.isPaused && !isOvertime && (state.totalPauseSeconds > 0 || state.totalOvertimeSeconds > 0 || state.overtimeSeconds > 0) && (
              <div className="text-center text-base text-[var(--timer-red)]/70">
                {t('timer.totalDelay')}: +{formatTime(state.totalPauseSeconds + state.totalOvertimeSeconds + state.overtimeSeconds)}
              </div>
            )}
          </div>
        </div>

        {/* Segment Carousel - Shows current segment centered with prev/next */}
        {/* Fixed height container to prevent layout shift when toggling carousel */}
        <div className="mb-4 w-full max-w-5xl overflow-hidden relative h-[4.5rem]">
          {showSegmentList && (
            <div className="flex items-center justify-center gap-4 py-2">
              {/* Show up to 2 segments before and 2 after current */}
              {state.segments.slice(
                Math.max(0, state.currentSegmentIndex - 2),
                Math.min(state.segments.length, state.currentSegmentIndex + 3)
              ).map((segment, relativeIndex) => {
                const actualIndex = Math.max(0, state.currentSegmentIndex - 2) + relativeIndex;
                const isCurrent = actualIndex === state.currentSegmentIndex;
                const isPast = actualIndex < state.currentSegmentIndex;
                const distance = Math.abs(actualIndex - state.currentSegmentIndex);
                
                return (
                  <div
                    key={actualIndex}
                    className={`flex-shrink-0 flex flex-col items-center transition-all duration-500 ${
                      isCurrent ? 'scale-100 opacity-100' : distance === 1 ? 'scale-90 opacity-70' : 'scale-75 opacity-40'
                    }`}
                    style={{
                      transform: `translateX(${(actualIndex - state.currentSegmentIndex) * 0}px)`
                    }}
                  >
                    <div
                      className={`px-3 py-1.5 rounded-lg transition-all text-sm ${
                        isCurrent
                          ? 'bg-primary/20 border border-primary text-primary-foreground shadow-lg'
                          : isPast
                          ? 'bg-muted/50 text-muted-foreground line-through'
                          : 'bg-muted/30 text-muted-foreground'
                      }`}
                    >
                      {segment.title}
                    </div>
                    <div className="text-xs text-muted-foreground/60 mt-1">
                      {Math.floor((segment.durationSeconds || (segment.durationMinutes * 60)) / 60)}:{String(Math.floor((segment.durationSeconds || (segment.durationMinutes * 60)) % 60)).padStart(2, '0')} Min
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Secondary Info - more subtle */}
        <div className="flex flex-wrap gap-4 justify-center w-full max-w-4xl mb-4 text-muted-foreground">
          <div className="text-center">
            <div className="text-xs uppercase tracking-wide mb-1">{t('timer.remaining')}</div>
            <div className="text-lg font-medium">{formatTime(remainingTotal)}</div>
          </div>

          {state.plannedEndTime && (
            <div className="text-center">
              <div className="text-xs uppercase tracking-wide mb-1">{t('timer.plannedEnd')}</div>
              <div className="text-lg font-medium">{state.plannedEndTime}</div>
            </div>
          )}

          <div className="text-center">
            <div className="text-xs uppercase tracking-wide mb-1">{t('timer.projectedEnd')}</div>
            <div className={`text-lg font-medium ${
              state.plannedEndTime && projectedEnd > parsePlannedEndTime(state.plannedEndTime)
                ? 'text-[var(--timer-red)]'
                : ''
            }`}>
              {formatClock(projectedEnd)}
            </div>
          </div>

          {state.showClock && (
            <div className="text-center">
              <div className="text-xs uppercase tracking-wide mb-1">{t('timer.currentTime')}</div>
              <div className="text-lg font-medium">{formatClock(currentTime)}</div>
            </div>
          )}
        </div>

        {/* Smart Compensate Controls */}
        {state.plannedEndTime && (
          <div className="flex flex-wrap gap-3 justify-center items-center mb-4">
            <Button
              onClick={() => extendPlannedEndTime(5)}
              size="sm"
              variant="outline"
              className="text-xs"
              title={t('timer.tooltipExtendTime')}
            >
              {t('timer.extendTime')}
            </Button>
            {projectedEnd.getTime() > parsePlannedEndTime(state.plannedEndTime).getTime() + 60000 && (() => {
              // Calculate reduction percentage for color coding
              const plannedDate = parsePlannedEndTime(state.plannedEndTime);
              const differenceSeconds = Math.floor((projectedEnd.getTime() - plannedDate.getTime()) / 1000);
              
              const currentSegment = state.segments[state.currentSegmentIndex];
              const segmentDurationSeconds = currentSegment?.durationSeconds || (currentSegment?.durationMinutes * 60) || 0;
              const currentRemainingSeconds = segmentDurationSeconds - state.elapsedSeconds;
              let totalRemainingSeconds = Math.max(0, currentRemainingSeconds);
              
              for (let i = state.currentSegmentIndex + 1; i < state.segments.length; i++) {
                const segment = state.segments[i];
                totalRemainingSeconds += segment.durationSeconds || (segment.durationMinutes * 60);
              }
              
              const reductionPercentage = totalRemainingSeconds > 0 ? (differenceSeconds / totalRemainingSeconds) * 100 : 0;
              
              // Color coding based on reduction percentage
              let buttonColor = 'bg-green-600 hover:bg-green-700'; // <10%
              if (reductionPercentage >= 25) {
                buttonColor = 'bg-red-600 hover:bg-red-700'; // >25%
              } else if (reductionPercentage >= 10) {
                buttonColor = 'bg-yellow-600 hover:bg-yellow-700'; // 10-25%
              }
              
              return (
                <Button
                  onClick={smartCompensate}
                  size="sm"
                  variant="default"
                  className={`text-xs ${buttonColor}`}
                  title={t('timer.tooltipSmartCompensate')}
                >
                  {t('timer.smartCompensate')}
                </Button>
              );
            })()}
          </div>
        )}

        {/* Controls */}
        <div className="flex flex-wrap gap-4 justify-center items-center">
          <Button
            onClick={previousSegment}
            disabled={state.currentSegmentIndex === 0}
            size="lg"
            variant="outline"
            className="w-14 h-14"
            title={t('timer.tooltipPrevious')}
          >
            <ChevronLeft className="h-6 w-6" />
          </Button>

          <Button
            onClick={handleStartPause}
            size="lg"
            className="w-40 h-14 text-lg"
            title={t('common.tooltipStartPause')}
          >
            {state.isRunning && !state.isPaused ? (
              <>
                <Pause className="h-6 w-6 mr-2" />
                {t('timer.pause')}
              </>
            ) : (
              <>
                <Play className="h-6 w-6 mr-2" />
                {t('timer.start')}
              </>
            )}
          </Button>

          <Button
            onClick={nextSegment}
            disabled={state.currentSegmentIndex === state.segments.length - 1}
            size="lg"
            variant="outline"
            className="w-14 h-14"
            title={t('timer.tooltipNext')}
          >
            <ChevronRight className="h-6 w-6" />
          </Button>

          <Button onClick={() => { resetTimer(); pauseAudio(); }} size="lg" variant="outline" title={t('timer.tooltipReset')}>
            <RotateCcw className="h-5 w-5" />
          </Button>

          <Button onClick={toggleClock} size="lg" variant="outline" title={t('timer.tooltipClock')}>
            <Clock className="h-5 w-5" />
          </Button>

          <Button
            onClick={toggleTicking}
            size="lg"
            variant={tickingEnabled ? 'default' : 'outline'}
            title={t('timer.tooltipTicking')}
          >
            {tickingEnabled ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
          </Button>

          <Button onClick={() => setShowSegmentList(!showSegmentList)} size="lg" variant="outline" title={t('timer.tooltipList')}>
            <List className="h-5 w-5" />
          </Button>

          <Button
            onClick={toggleCurrentSegmentMode}
            size="lg"
            variant={currentSegment.mode === 'manual' ? 'default' : 'outline'}
            title={currentSegment.mode === 'auto' ? t('common.auto') : t('common.manual')}
          >
            {currentSegment.mode === 'auto'
              ? <SkipForward className="h-5 w-5" />
              : <Hand className="h-5 w-5" />}
          </Button>

          {fullscreenAvailable && (
            <Button onClick={toggleFullscreen} size="lg" variant="outline" title={t('timer.tooltipFullscreen')}>
              <Maximize className="h-5 w-5" />
            </Button>
          )}

          {!isFullscreen && (
            isLastSegment() && state.isRunning ? (
              <Button
                onClick={() => {
                  pauseAudio();
                  endSession();
                  setLocation('/');
                }}
                size="lg"
                variant="default"
                className="bg-primary hover:bg-primary/90"
              >
                {t('timer.endSession')}
              </Button>
            ) : (
              <Button onClick={() => { pauseAudio(); setLocation('/'); }} size="lg" variant="outline" title={t('timer.tooltipSettings')}>
                <Settings className="h-5 w-5" />
              </Button>
            )
          )}
        </div>

        {/* Keyboard Shortcuts Hint - Always visible, even in fullscreen */}
        <div className="mt-4 text-center text-xs text-muted-foreground/60">
          <div className="mb-1 font-semibold">{t('timer.keyboardShortcuts')}</div>
          <div className="space-y-0.5">
            <div>{t('timer.keySpace')}</div>
            <div>{t('timer.keyArrows')}</div>
            <div>{t('timer.keyF')}</div>
          </div>
        </div>
      </div>

    </div>
  );
}


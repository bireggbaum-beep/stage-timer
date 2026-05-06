import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { X, Plus, Play, Volume2, VolumeX, GripVertical, Hand, Eye, Link, Minus } from 'lucide-react';
import TemplateManager from '@/components/TemplateManager';
import { useTimer } from '@/contexts/TimerContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Segment, SegmentMode } from '@/types/timer';
import { useLocation } from 'wouter';

export default function Setup() {
  const { setSegments, setPlannedEndTime } = useTimer();
  const { t, language, setLanguage } = useLanguage();
  const [, setLocation] = useLocation();
  const [plannedEndTimeInput, setPlannedEndTimeInput] = useState<string>('');
  const [tickingEnabled, setTickingEnabled] = useState<boolean>(() => {
    const stored = localStorage.getItem('tickingEnabled_v2');
    return stored === null ? true : stored === 'true';
  });
  const [autoZenEnabled, setAutoZenEnabled] = useState<boolean>(() => {
    const stored = localStorage.getItem('autoZenEnabled');
    return stored === null ? true : stored === 'true';
  });

  const toggleTicking = () => {
    const next = !tickingEnabled;
    setTickingEnabled(next);
    localStorage.setItem('tickingEnabled_v2', String(next));
  };

  const toggleAutoZen = () => {
    const next = !autoZenEnabled;
    setAutoZenEnabled(next);
    localStorage.setItem('autoZenEnabled', String(next));
  };
  const [segments, setLocalSegments] = useState<Segment[]>(() => {
    const saved = localStorage.getItem('timerSegments');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return getDefaultSegments();
      }
    }
    return getDefaultSegments();
  });

  function getDefaultSegments(): Segment[] {
    return [
      { id: crypto.randomUUID(), title: language === 'de' ? 'Einleitung' : 'Introduction', durationMinutes: 5, mode: 'auto' },
      { id: crypto.randomUUID(), title: language === 'de' ? 'Hauptteil' : 'Main Part', durationMinutes: 40, mode: 'auto' },
      { id: crypto.randomUUID(), title: 'Q&A', durationMinutes: 15, mode: 'manual' },
    ];
  }

  useEffect(() => {
    localStorage.setItem('timerSegments', JSON.stringify(segments));
  }, [segments]);

  const addSegment = () => {
    setLocalSegments([
      ...segments,
      { id: crypto.randomUUID(), title: language === 'de' ? 'Neues Segment' : 'New Segment', durationMinutes: 10, mode: 'auto' },
    ]);
  };

  const removeSegment = (id: string) => {
    if (segments.length > 1) {
      setLocalSegments(segments.filter((s) => s.id !== id));
    }
  };

  // Drag & drop
  const dragIndex = useRef<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const segmentListRef = useRef<HTMLDivElement>(null);

  const reorder = useCallback((fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;
    const updated = [...segments];
    const [dragged] = updated.splice(fromIndex, 1);
    updated.splice(toIndex, 0, dragged);
    setLocalSegments(updated);
  }, [segments]);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    dragIndex.current = index;
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDragEnd = () => {
    if (dragIndex.current !== null && dragOverIndex !== null) {
      reorder(dragIndex.current, dragOverIndex);
    }
    dragIndex.current = null;
    setDragOverIndex(null);
  };

  const touchCurrentIndex = useRef<number | null>(null);

  const handleTouchStart = (index: number, e: React.TouchEvent) => {
    dragIndex.current = index;
    touchCurrentIndex.current = index;
    e.preventDefault();
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (dragIndex.current === null || !segmentListRef.current) return;
    const touch = e.touches[0];
    const elements = segmentListRef.current.querySelectorAll('[data-segment-index]');
    for (const el of elements) {
      const rect = el.getBoundingClientRect();
      if (touch.clientY >= rect.top && touch.clientY <= rect.bottom) {
        const idx = parseInt(el.getAttribute('data-segment-index')!);
        if (idx !== touchCurrentIndex.current) {
          touchCurrentIndex.current = idx;
          setDragOverIndex(idx);
        }
        break;
      }
    }
  };

  const handleTouchEnd = () => {
    if (dragIndex.current !== null && touchCurrentIndex.current !== null) {
      reorder(dragIndex.current, touchCurrentIndex.current);
    }
    dragIndex.current = null;
    touchCurrentIndex.current = null;
    setDragOverIndex(null);
  };

  const updateSegment = (id: string, field: keyof Segment, value: string | number | SegmentMode) => {
    setLocalSegments(
      segments.map((s) => (s.id === id ? { ...s, [field]: value } : s))
    );
  };

  const startTimer = () => {
    setSegments(segments);
    setPlannedEndTime(plannedEndTimeInput || null);
    setLocation('/timer');
  };

  const totalMinutes = segments.reduce((sum, s) => sum + s.durationMinutes, 0);

  return (
    <div className="min-h-screen bg-background text-foreground p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-1">{t('setup.title')}</h1>
          <p className="text-muted-foreground text-sm mb-3">
            {t('setup.subtitle')}
          </p>
          {/* Compact settings row */}
          <div className="flex items-center gap-1 text-muted-foreground">
            <button
              onClick={toggleTicking}
              title={t('setup.tickingSound')}
              className={`p-2 rounded-md transition-colors ${tickingEnabled ? 'text-foreground bg-muted' : 'hover:text-foreground hover:bg-muted/50'}`}
            >
              {tickingEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            </button>
            <button
              onClick={toggleAutoZen}
              title={t('setup.autoZen')}
              className={`p-2 rounded-md transition-colors ${autoZenEnabled ? 'text-foreground bg-muted' : 'hover:text-foreground hover:bg-muted/50'}`}
            >
              <Eye className="h-4 w-4" />
            </button>
            <div className="w-px h-4 bg-border mx-1" />
            <button
              onClick={() => setLanguage(language === 'de' ? 'en' : 'de')}
              title={t('setup.language')}
              className="p-2 rounded-md hover:text-foreground hover:bg-muted/50 transition-colors text-xs font-semibold w-8 text-center"
            >
              {language.toUpperCase()}
            </button>
          </div>
        </div>

        <TemplateManager segments={segments} onLoadTemplate={setLocalSegments} />

        {/* Rundown List */}
        <div ref={segmentListRef} className="mb-6">
          {segments.map((segment, index) => (
            <div key={segment.id}>
              {/* Chain/stop indicator between segments */}
              {index > 0 && (
                <div className="flex items-center justify-center -my-1 relative z-10">
                  <button
                    onClick={() => {
                      const prevSegment = segments[index - 1];
                      updateSegment(prevSegment.id, 'mode', prevSegment.mode === 'auto' ? 'manual' : 'auto');
                    }}
                    title={segments[index - 1].mode === 'auto' ? t('setup.modeAuto') : t('setup.modeManual')}
                    className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs transition-colors ${
                      segments[index - 1].mode === 'auto'
                        ? 'bg-primary/20 text-primary hover:bg-primary/30'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    }`}
                  >
                    {segments[index - 1].mode === 'auto' ? (
                      <><Link className="h-3 w-3" /><span>{t('common.auto')}</span></>
                    ) : (
                      <><Hand className="h-3 w-3" /><span>{t('common.manual')}</span></>
                    )}
                  </button>
                </div>
              )}

              {/* Segment row */}
              <div
                data-segment-index={index}
                onDragOver={(e) => handleDragOver(e, index)}
                className={`flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg border transition-colors ${
                  dragOverIndex === index ? 'border-primary bg-primary/5' : 'border-border bg-card'
                }`}
              >
                {/* Drag handle */}
                <div
                  draggable
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragEnd={handleDragEnd}
                  onTouchStart={(e) => handleTouchStart(index, e)}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleTouchEnd}
                  className="shrink-0 touch-none cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
                >
                  <GripVertical className="h-4 w-4" />
                </div>

                {/* Segment number */}
                <span className="text-xs text-muted-foreground/60 w-4 shrink-0 text-center">{index + 1}</span>

                {/* Title - inline edit */}
                <input
                  value={segment.title}
                  onChange={(e) => updateSegment(segment.id, 'title', e.target.value)}
                  placeholder={language === 'de' ? 'Titel...' : 'Title...'}
                  className="flex-1 min-w-0 bg-transparent border-none outline-none text-sm font-medium text-foreground placeholder:text-muted-foreground/40 focus:bg-muted/30 rounded px-1 -mx-1 transition-colors"
                />

                {/* Duration with +/- */}
                <div className="flex items-center shrink-0 gap-0.5">
                  <button
                    onClick={() => updateSegment(segment.id, 'durationMinutes', Math.max(1, segment.durationMinutes - 1))}
                    className="p-1 text-muted-foreground hover:text-foreground transition-colors rounded hover:bg-muted/50"
                  >
                    <Minus className="h-3 w-3" />
                  </button>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={segment.durationMinutes === 0 ? '' : segment.durationMinutes}
                    onChange={(e) => {
                      const value = e.target.value.replace(/[^0-9]/g, '');
                      updateSegment(segment.id, 'durationMinutes', value === '' ? 0 : parseInt(value));
                    }}
                    onBlur={(e) => {
                      const value = e.target.value;
                      if (value === '' || parseInt(value) < 1) {
                        updateSegment(segment.id, 'durationMinutes', 1);
                      }
                    }}
                    className="w-10 text-center bg-muted/30 rounded text-sm font-mono tabular-nums text-foreground border-none outline-none focus:bg-muted/50 transition-colors py-1"
                  />
                  <span className="text-xs text-muted-foreground mr-0.5">m</span>
                  <button
                    onClick={() => updateSegment(segment.id, 'durationMinutes', segment.durationMinutes + 1)}
                    className="p-1 text-muted-foreground hover:text-foreground transition-colors rounded hover:bg-muted/50"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                </div>

                {/* Quick durations - hidden on small screens */}
                <div className="hidden sm:flex items-center gap-0.5 shrink-0">
                  {[5, 15, 25, 45].map((min) => (
                    <button
                      key={min}
                      onClick={() => updateSegment(segment.id, 'durationMinutes', min)}
                      className={`px-1.5 py-0.5 rounded text-xs transition-colors ${
                        segment.durationMinutes === min
                          ? 'bg-primary/20 text-primary'
                          : 'text-muted-foreground/60 hover:text-foreground hover:bg-muted/50'
                      }`}
                    >
                      {min}
                    </button>
                  ))}
                </div>

                {/* Delete */}
                <button
                  onClick={() => removeSegment(segment.id)}
                  disabled={segments.length === 1}
                  className="shrink-0 p-1 text-muted-foreground/40 hover:text-destructive disabled:opacity-20 transition-colors rounded"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}

          {/* Add segment button */}
          <button
            onClick={addSegment}
            className="w-full mt-2 py-2 border border-dashed border-border rounded-lg text-sm text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors flex items-center justify-center gap-2"
          >
            <Plus className="h-4 w-4" />
            {t('setup.addSegment')}
          </button>
        </div>

        <Card className="p-6 mb-6 bg-card text-card-foreground">
          <div className="space-y-4">
            <div>
              <Label htmlFor="plannedEndTime">{t('setup.plannedEndTime')}</Label>
              <p className="text-xs text-muted-foreground mb-2">
                {t('setup.plannedEndTimeHint')}
              </p>
              <Input
                id="plannedEndTime"
                type="time"
                value={plannedEndTimeInput}
                onChange={(e) => setPlannedEndTimeInput(e.target.value)}
                className="bg-background w-full sm:w-48"
                placeholder="HH:MM"
              />
            </div>
          </div>
        </Card>

        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between p-6 bg-card rounded-lg border border-border">
          <div>
            <div className="text-sm text-muted-foreground">{t('setup.totalDuration')}</div>
            <div className="text-2xl font-bold">{totalMinutes} {t('setup.minutes')}</div>
          </div>

          <Button onClick={startTimer} size="lg" className="w-full sm:w-auto">
            <Play className="h-5 w-5 mr-2" />
            {t('setup.startTimer')}
          </Button>
        </div>


        <div className="mt-4 text-center text-xs text-muted-foreground">
          <a
            href="https://bireggbaum-beep.github.io/stage-timer/"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline"
          >
            https://bireggbaum-beep.github.io/stage-timer/
          </a>
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Trash2, Plus, Play, Volume2, VolumeX, GripVertical } from 'lucide-react';
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

  const toggleTicking = () => {
    const next = !tickingEnabled;
    setTickingEnabled(next);
    localStorage.setItem('tickingEnabled_v2', String(next));
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

  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);

  const handleDragStart = (index: number) => {
    dragItem.current = index;
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    dragOverItem.current = index;
  };

  const handleDrop = () => {
    if (dragItem.current === null || dragOverItem.current === null) return;
    if (dragItem.current === dragOverItem.current) return;
    const updated = [...segments];
    const [dragged] = updated.splice(dragItem.current, 1);
    updated.splice(dragOverItem.current, 0, dragged);
    setLocalSegments(updated);
    dragItem.current = null;
    dragOverItem.current = null;
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
        <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">{t('setup.title')}</h1>
            <p className="text-muted-foreground">
              {t('setup.subtitle')}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant={tickingEnabled ? 'default' : 'outline'}
              size="sm"
              onClick={toggleTicking}
              title={t('setup.tickingSound')}
            >
              {tickingEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            </Button>
            <Label className="text-sm text-muted-foreground">{t('setup.language')}:</Label>
            <Select value={language} onValueChange={(value) => setLanguage(value as 'de' | 'en')}>
              <SelectTrigger className="w-24 bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="de">DE</SelectItem>
                <SelectItem value="en">EN</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <TemplateManager segments={segments} onLoadTemplate={setLocalSegments} />

        <Card className="p-6 mb-6 bg-card text-card-foreground">
          <div className="space-y-4">
            {segments.map((segment, index) => (
              <div
                key={segment.id}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDrop={handleDrop}
                className="flex flex-col md:flex-row gap-4 p-4 rounded-lg bg-muted/30 border border-border"
              >
                <div className="flex items-center justify-center cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground">
                  <GripVertical className="h-5 w-5" />
                </div>
                <div className="flex-1 space-y-2">
                  <Label htmlFor={`title-${segment.id}`}>{t('setup.segment')} {index + 1}</Label>
                  <Input
                    id={`title-${segment.id}`}
                    value={segment.title}
                    onChange={(e) => updateSegment(segment.id, 'title', e.target.value)}
                    placeholder="Titel des Segments"
                    className="bg-background"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`duration-${segment.id}`}>{t('setup.duration')}</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id={`duration-${segment.id}`}
                      type="text"
                      inputMode="numeric"
                      value={segment.durationMinutes === 0 ? '' : segment.durationMinutes}
                      onChange={(e) => {
                        const value = e.target.value.replace(/[^0-9]/g, '');
                        if (value === '') {
                          updateSegment(segment.id, 'durationMinutes', 0);
                        } else {
                          const num = parseInt(value);
                          updateSegment(segment.id, 'durationMinutes', num);
                        }
                      }}
                      onBlur={(e) => {
                        const value = e.target.value;
                        if (value === '' || parseInt(value) < 1) {
                          updateSegment(segment.id, 'durationMinutes', 1);
                        }
                      }}
                      placeholder="Min."
                      className="bg-background w-20"
                    />
                    <div className="flex gap-1">
                      {[5, 10, 15, 20, 25].map((min) => (
                        <Button
                          key={min}
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => updateSegment(segment.id, 'durationMinutes', min)}
                          className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground hover:bg-muted"
                        >
                          {min}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="w-full md:w-40 space-y-2">
                  <Label htmlFor={`mode-${segment.id}`}>{t('setup.mode')}</Label>
                  <Select
                    value={segment.mode}
                    onValueChange={(value) => updateSegment(segment.id, 'mode', value as SegmentMode)}
                  >
                    <SelectTrigger id={`mode-${segment.id}`} className="bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">{t('setup.modeAuto')}</SelectItem>
                      <SelectItem value="manual">{t('setup.modeManual')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-end">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeSegment(segment.id)}
                    disabled={segments.length === 1}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 flex flex-col sm:flex-row gap-4">
            <Button onClick={addSegment} variant="outline" className="flex-1">
              <Plus className="h-4 w-4 mr-2" />
              {t('setup.addSegment')}
            </Button>
          </div>
        </Card>

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

        <div className="mt-8 p-4 bg-muted/50 rounded-lg border border-border">
          <h3 className="font-semibold mb-2">{t('setup.hints')}</h3>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>
              <strong>{t('setup.modeAuto')}:</strong> {t('setup.hintAuto')}
            </li>
            <li>
              <strong>{t('setup.modeManual')}:</strong> {t('setup.hintManual')}
            </li>
          </ul>
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


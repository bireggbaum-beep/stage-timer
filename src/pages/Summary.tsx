import { Button } from "@/components/ui/button";
import { useTimer } from "@/contexts/TimerContext";
import { CheckCircle2, Clock, Pause, TrendingUp } from "lucide-react";
import { useLocation } from "wouter";

interface SummaryData {
  plannedTotalMinutes: number;
  actualTotalSeconds: number;
  totalPauseSeconds: number;
  totalOvertimeSeconds: number;
  plannedEndTime?: string;
  actualEndTime: Date;
  segments: Array<{
    title: string;
    plannedSeconds: number;
    actualSeconds: number;
  }>;
}

export default function Summary() {
  const [, setLocation] = useLocation();
  const { state } = useTimer();

  // Get summary data from location state or calculate from context
  const summaryData: SummaryData = (history.state as any)?.summaryData || {
    plannedTotalMinutes: state.segments.reduce((sum, seg) => sum + seg.durationMinutes, 0),
    actualTotalSeconds: 0,
    totalPauseSeconds: state.totalPauseSeconds,
    totalOvertimeSeconds: state.totalOvertimeSeconds,
    actualEndTime: new Date(),
    segments: state.segments.map(seg => ({
      title: seg.title,
      plannedSeconds: seg.durationMinutes * 60,
      actualSeconds: seg.durationMinutes * 60,
    })),
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(Math.abs(seconds) / 60);
    const secs = Math.floor(Math.abs(seconds) % 60);
    const sign = seconds < 0 ? '-' : '';
    return `${sign}${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const formatClock = (date: Date): string => {
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  };

  const plannedTotalSeconds = summaryData.plannedTotalMinutes * 60;
  const totalDelaySeconds = summaryData.totalPauseSeconds + summaryData.totalOvertimeSeconds;
  const efficiency = plannedTotalSeconds > 0 
    ? ((plannedTotalSeconds / (summaryData.actualTotalSeconds || plannedTotalSeconds)) * 100).toFixed(1)
    : '100.0';

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-3xl space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-3">
            <CheckCircle2 className="w-12 h-12 text-green-500" />
            <h1 className="text-4xl font-bold">Session Abgeschlossen</h1>
          </div>
          <p className="text-muted-foreground">
            Hier ist eine Zusammenfassung Ihrer Präsentation
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Total Time */}
          <div className="bg-card border border-border rounded-lg p-6">
            <div className="flex items-center gap-3 mb-3">
              <Clock className="w-5 h-5 text-primary" />
              <h3 className="font-semibold">Gesamtzeit</h3>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Geplant:</span>
                <span className="font-mono">{formatTime(plannedTotalSeconds)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tatsächlich:</span>
                <span className="font-mono">{formatTime(summaryData.actualTotalSeconds)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-border">
                <span className="text-muted-foreground">Differenz:</span>
                <span className={`font-mono ${totalDelaySeconds > 0 ? 'text-red-500' : 'text-green-500'}`}>
                  {totalDelaySeconds > 0 ? '+' : ''}{formatTime(totalDelaySeconds)}
                </span>
              </div>
            </div>
          </div>

          {/* Delays */}
          <div className="bg-card border border-border rounded-lg p-6">
            <div className="flex items-center gap-3 mb-3">
              <Pause className="w-5 h-5 text-primary" />
              <h3 className="font-semibold">Verzögerungen</h3>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Pausen:</span>
                <span className="font-mono">{formatTime(summaryData.totalPauseSeconds)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Überziehungen:</span>
                <span className="font-mono">{formatTime(summaryData.totalOvertimeSeconds)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-border">
                <span className="text-muted-foreground">Gesamt:</span>
                <span className="font-mono text-red-500">+{formatTime(totalDelaySeconds)}</span>
              </div>
            </div>
          </div>

          {/* End Time */}
          {summaryData.plannedEndTime && (
            <div className="bg-card border border-border rounded-lg p-6">
              <div className="flex items-center gap-3 mb-3">
                <Clock className="w-5 h-5 text-primary" />
                <h3 className="font-semibold">Endzeit</h3>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Geplant:</span>
                  <span className="font-mono">{summaryData.plannedEndTime}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tatsächlich:</span>
                  <span className="font-mono">{formatClock(summaryData.actualEndTime)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Efficiency */}
          <div className="bg-card border border-border rounded-lg p-6">
            <div className="flex items-center gap-3 mb-3">
              <TrendingUp className="w-5 h-5 text-primary" />
              <h3 className="font-semibold">Effizienz</h3>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold">{efficiency}%</div>
              <p className="text-sm text-muted-foreground mt-1">
                Zeitplan-Einhaltung
              </p>
            </div>
          </div>
        </div>

        {/* Segment Details */}
        <div className="bg-card border border-border rounded-lg p-6">
          <h3 className="font-semibold mb-4">Segment-Details</h3>
          <div className="space-y-3">
            {summaryData.segments.map((segment, index) => {
              const diff = segment.actualSeconds - segment.plannedSeconds;
              return (
                <div key={index} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <span className="font-medium">{segment.title}</span>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-muted-foreground">
                      {formatTime(segment.plannedSeconds)} → {formatTime(segment.actualSeconds)}
                    </span>
                    <span className={`text-sm font-mono ${diff > 0 ? 'text-red-500' : diff < 0 ? 'text-green-500' : 'text-muted-foreground'}`}>
                      {diff > 0 ? '+' : ''}{formatTime(diff)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-center gap-4">
          <Button
            onClick={() => setLocation('/')}
            size="lg"
            className="px-8"
          >
            Neue Session starten
          </Button>
        </div>
      </div>
    </div>
  );
}


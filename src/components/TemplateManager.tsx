import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Cloud, Trash2, Save, Download } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Segment, AirtableTemplate } from '@/types/timer';
import {
  isConfigured,
  fetchTemplates,
  saveTemplate,
  deleteTemplate,
} from '@/services/airtable';

interface TemplateManagerProps {
  segments: Segment[];
  onLoadTemplate: (segments: Segment[]) => void;
}

export default function TemplateManager({ segments, onLoadTemplate }: TemplateManagerProps) {
  const { t } = useLanguage();
  const [templates, setTemplates] = useState<AirtableTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [statusMsg, setStatusMsg] = useState<{ text: string; isError: boolean } | null>(null);

  const showStatus = useCallback((text: string, isError = false) => {
    setStatusMsg({ text, isError });
    setTimeout(() => setStatusMsg(null), 3000);
  }, []);

  const loadTemplates = useCallback(async () => {
    setIsLoading(true);
    const result = await fetchTemplates();
    setTemplates(result);
    setSelectedId('');
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  if (!isConfigured()) return null;

  const handleSave = async () => {
    const name = saveName.trim();
    if (!name) {
      showStatus(t('templates.nameRequired'), true);
      return;
    }
    setIsSaving(true);
    const existing = templates.find(
      (tmpl) => tmpl.name.toLowerCase() === name.toLowerCase(),
    );
    const result = await saveTemplate(name, segments);
    setIsSaving(false);
    if (result) {
      setSaveName('');
      showStatus(existing ? t('templates.updated') : t('templates.saved'));
      await loadTemplates();
    } else {
      showStatus(t('templates.errorSave'), true);
    }
  };

  const handleLoad = () => {
    const tmpl = templates.find((t) => t.id === selectedId);
    if (!tmpl) return;
    const freshSegments = tmpl.segments.map((s) => ({
      ...s,
      id: crypto.randomUUID(),
      actualDurationSeconds: undefined,
      durationSeconds: undefined,
    }));
    onLoadTemplate(freshSegments);
    showStatus(t('templates.loaded'));
  };

  const handleDelete = async () => {
    if (!selectedId) return;
    const ok = await deleteTemplate(selectedId);
    if (ok) {
      setTemplates((prev) => prev.filter((tmpl) => tmpl.id !== selectedId));
      setSelectedId('');
      showStatus(t('templates.deleted'));
    } else {
      showStatus(t('templates.errorDelete'), true);
    }
  };

  return (
    <div className="mb-4 space-y-2">
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Cloud className="h-3.5 w-3.5" />
        <span>{t('templates.title')}</span>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
        {/* Load: Dropdown + Load + Delete */}
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="h-9 flex-1 min-w-0 rounded-md border border-border bg-background px-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer"
          >
            <option value="">
              {isLoading ? t('templates.loading') : templates.length === 0 ? t('templates.empty') : `${t('templates.load')}...`}
            </option>
            {templates.map((tmpl) => (
              <option key={tmpl.id} value={tmpl.id}>
                {tmpl.name} ({tmpl.segments.length} Seg.)
              </option>
            ))}
          </select>
          <Button
            onClick={handleLoad}
            disabled={!selectedId}
            variant="outline"
            size="sm"
            className="shrink-0 h-9 w-9 p-0"
          >
            <Download className="h-4 w-4" />
          </Button>
          <Button
            onClick={handleDelete}
            disabled={!selectedId}
            variant="ghost"
            size="sm"
            className="shrink-0 h-9 w-9 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>

        {/* Save: Input + Save */}
        <div className="flex items-center gap-1.5">
          <Input
            value={saveName}
            onChange={(e) => setSaveName(e.target.value)}
            placeholder={t('templates.savePlaceholder')}
            className="bg-background h-9 text-sm w-full sm:w-44"
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSave();
            }}
          />
          <Button
            onClick={handleSave}
            disabled={isSaving || segments.length === 0}
            size="sm"
            className="shrink-0 h-9 px-3"
          >
            <Save className="h-4 w-4 mr-1" />
            {isSaving ? '...' : t('templates.save')}
          </Button>
        </div>
      </div>

      {/* Status message */}
      {statusMsg && (
        <div
          className={`text-xs px-2 py-1 rounded ${
            statusMsg.isError
              ? 'bg-destructive/10 text-destructive'
              : 'bg-primary/10 text-primary'
          }`}
        >
          {statusMsg.text}
        </div>
      )}
    </div>
  );
}

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Cloud, X, Save } from 'lucide-react';
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
  const [statusMsg, setStatusMsg] = useState<{ text: string; isError: boolean } | null>(null);

  const showStatus = useCallback((text: string, isError = false) => {
    setStatusMsg({ text, isError });
    setTimeout(() => setStatusMsg(null), 3000);
  }, []);

  const loadTemplates = useCallback(async () => {
    setIsLoading(true);
    const result = await fetchTemplates();
    setTemplates(result);
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

  const handleLoad = (tmpl: AirtableTemplate) => {
    const freshSegments = tmpl.segments.map((s) => ({
      ...s,
      id: crypto.randomUUID(),
      actualDurationSeconds: undefined,
      durationSeconds: undefined,
    }));
    onLoadTemplate(freshSegments);
    showStatus(t('templates.loaded'));
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const ok = await deleteTemplate(id);
    if (ok) {
      setTemplates((prev) => prev.filter((tmpl) => tmpl.id !== id));
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

      {/* Chips + Save */}
      <div className="flex flex-wrap items-center gap-2">
        {isLoading ? (
          <span className="text-xs text-muted-foreground">{t('templates.loading')}</span>
        ) : templates.length === 0 ? (
          <span className="text-xs text-muted-foreground">{t('templates.empty')}</span>
        ) : (
          templates.map((tmpl) => (
            <button
              key={tmpl.id}
              onClick={() => handleLoad(tmpl)}
              className="inline-flex items-center gap-1 h-7 pl-2.5 pr-1 rounded-full bg-muted/50 border border-border text-xs hover:bg-muted/80 transition-colors"
            >
              <span>{tmpl.name}</span>
              <span
                onClick={(e) => handleDelete(tmpl.id, e)}
                className="ml-0.5 p-0.5 rounded-full hover:bg-destructive/20 hover:text-destructive transition-colors"
              >
                <X className="h-3 w-3" />
              </span>
            </button>
          ))
        )}

        {/* Save inline */}
        <div className="inline-flex items-center gap-1.5">
          <Input
            value={saveName}
            onChange={(e) => setSaveName(e.target.value)}
            placeholder={t('templates.savePlaceholder')}
            className="bg-background h-7 text-xs w-32 rounded-full px-2.5"
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSave();
            }}
          />
          <Button
            onClick={handleSave}
            disabled={isSaving || segments.length === 0}
            size="sm"
            className="h-7 px-2.5 rounded-full text-xs"
          >
            <Save className="h-3 w-3 mr-1" />
            {isSaving ? '...' : t('templates.save')}
          </Button>
        </div>
      </div>

      {/* Status */}
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

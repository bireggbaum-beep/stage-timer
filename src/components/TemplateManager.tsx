import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Cloud, RefreshCw, Trash2, Save, ChevronDown, ChevronUp, Download } from 'lucide-react';
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
  const [isOpen, setIsOpen] = useState(false);
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
    if (isOpen && templates.length === 0) {
      loadTemplates();
    }
  }, [isOpen, loadTemplates, templates.length]);

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

  const handleDelete = async (id: string) => {
    const ok = await deleteTemplate(id);
    if (ok) {
      setTemplates((prev) => prev.filter((tmpl) => tmpl.id !== id));
      showStatus(t('templates.deleted'));
    } else {
      showStatus(t('templates.errorDelete'), true);
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

  return (
    <div className="mb-4">
      {/* Compact toggle bar */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <Cloud className="h-4 w-4" />
        <span>{t('templates.title')}</span>
        {isOpen ? (
          <ChevronUp className="h-3 w-3" />
        ) : (
          <ChevronDown className="h-3 w-3" />
        )}
      </button>

      {isOpen && (
        <div className="mt-3 p-4 rounded-lg border border-border bg-muted/20 space-y-3">
          {/* Save row */}
          <div className="flex gap-2">
            <Input
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              placeholder={t('templates.savePlaceholder')}
              className="bg-background flex-1 h-8 text-sm"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSave();
              }}
            />
            <Button
              onClick={handleSave}
              disabled={isSaving || segments.length === 0}
              size="sm"
              className="shrink-0 h-8"
            >
              <Save className="h-3 w-3 mr-1" />
              {isSaving ? t('templates.saving') : t('templates.save')}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={loadTemplates}
              disabled={isLoading}
              className="shrink-0 h-8 px-2"
            >
              <RefreshCw className={`h-3 w-3 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
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

          {/* Template list */}
          {isLoading && templates.length === 0 ? (
            <div className="text-xs text-muted-foreground text-center py-2">
              {t('templates.loading')}
            </div>
          ) : templates.length === 0 ? (
            <div className="text-xs text-muted-foreground text-center py-2">
              {t('templates.empty')}
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {templates.map((tmpl) => (
                <div
                  key={tmpl.id}
                  className="flex items-center gap-1 pl-3 pr-1 py-1 rounded-full bg-muted/40 border border-border hover:bg-muted/60 transition-colors text-sm"
                >
                  <button
                    onClick={() => handleLoad(tmpl)}
                    className="flex items-center gap-1.5"
                  >
                    <Download className="h-3 w-3 text-muted-foreground" />
                    <span>{tmpl.name}</span>
                  </button>
                  <button
                    onClick={() => handleDelete(tmpl.id)}
                    className="ml-1 p-1 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

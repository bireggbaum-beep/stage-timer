import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
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
    if (result.length === 0 && isOpen) {
      // Don't show error on empty list
    }
  }, [isOpen]);

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

  const formatDate = (iso: string) => {
    if (!iso) return '';
    try {
      return new Date(iso).toLocaleDateString();
    } catch {
      return '';
    }
  };

  return (
    <Card className="p-6 mb-6 bg-card text-card-foreground">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between text-left"
      >
        <div className="flex items-center gap-2">
          <Cloud className="h-5 w-5 text-primary" />
          <span className="font-semibold text-lg">{t('templates.title')}</span>
        </div>
        {isOpen ? (
          <ChevronUp className="h-5 w-5 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-5 w-5 text-muted-foreground" />
        )}
      </button>

      {isOpen && (
        <div className="mt-4 space-y-4">
          {/* Save section */}
          <div className="flex gap-2">
            <Input
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              placeholder={t('templates.savePlaceholder')}
              className="bg-background flex-1"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSave();
              }}
            />
            <Button
              onClick={handleSave}
              disabled={isSaving || segments.length === 0}
              className="shrink-0"
            >
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? t('templates.saving') : t('templates.save')}
            </Button>
          </div>

          {/* Status message */}
          {statusMsg && (
            <div
              className={`text-sm px-3 py-2 rounded ${
                statusMsg.isError
                  ? 'bg-destructive/10 text-destructive'
                  : 'bg-primary/10 text-primary'
              }`}
            >
              {statusMsg.text}
            </div>
          )}

          {/* Template list */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground font-medium">
                {t('templates.load')}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={loadTemplates}
                disabled={isLoading}
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
            </div>

            {isLoading && templates.length === 0 ? (
              <div className="text-sm text-muted-foreground py-4 text-center">
                {t('templates.loading')}
              </div>
            ) : templates.length === 0 ? (
              <div className="text-sm text-muted-foreground py-4 text-center">
                {t('templates.empty')}
              </div>
            ) : (
              <div className="space-y-1">
                {templates.map((tmpl) => (
                  <div
                    key={tmpl.id}
                    className="flex items-center gap-2 p-3 rounded-lg bg-muted/30 border border-border hover:bg-muted/50 transition-colors"
                  >
                    <button
                      onClick={() => handleLoad(tmpl)}
                      className="flex-1 text-left flex items-center gap-3 min-w-0"
                    >
                      <Download className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="min-w-0">
                        <div className="font-medium truncate">{tmpl.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {tmpl.segments.length} Segment{tmpl.segments.length !== 1 ? 'e' : ''} &middot; {formatDate(tmpl.created)}
                        </div>
                      </div>
                    </button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(tmpl.id)}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}

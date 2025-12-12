import { useState } from 'react';
import { Button } from '@avine/ui';
import { api } from '../lib/api';
import { Download, FileText, Table, Youtube, Disc, ListMusic, FileCode, Check, ChevronDown } from 'lucide-react';

interface ExportButtonProps {
  sessionId: string;
}

const exportFormats = [
  { id: 'json', name: 'JSON', description: 'Full structured data', icon: FileCode },
  { id: 'csv', name: 'CSV', description: 'Spreadsheet format', icon: Table },
  { id: 'txt', name: 'Plain Text', description: 'Human readable', icon: FileText },
  { id: 'youtube', name: 'YouTube Chapters', description: 'Video timestamps', icon: Youtube },
  { id: 'cue', name: 'CUE Sheet', description: 'Audio indexing', icon: Disc },
  { id: 'm3u', name: 'M3U Playlist', description: 'Playlist format', icon: ListMusic },
  { id: 'markdown', name: 'Markdown', description: 'Documentation', icon: FileCode },
] as const;

export function ExportButton({ sessionId }: ExportButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [exporting, setExporting] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const handleExport = async (format: string, download: boolean = false) => {
    try {
      setExporting(format);
      
      const { data } = await api.get(`/sessions/${sessionId}/export`, {
        params: { format, download: download.toString() },
      });

      if (download) {
        // Create download link
        const blob = new Blob([typeof data === 'string' ? data : JSON.stringify(data, null, 2)], { 
          type: 'text/plain' 
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `avine-${sessionId.slice(0, 8)}.${getExtension(format)}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        // Copy to clipboard
        const text = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
        await navigator.clipboard.writeText(text);
        setCopied(format);
        setTimeout(() => setCopied(null), 2000);
      }
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setExporting(null);
    }
  };

  const getExtension = (format: string) => {
    switch (format) {
      case 'json': return 'json';
      case 'csv': return 'csv';
      case 'cue': return 'cue';
      case 'm3u': return 'm3u';
      case 'markdown': return 'md';
      default: return 'txt';
    }
  };

  return (
    <div className="relative">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2"
      >
        <Download className="w-4 h-4" />
        Export
        <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </Button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)} 
          />
          <div className="absolute right-0 top-full mt-2 z-50 w-64 rounded-lg border bg-card shadow-xl overflow-hidden">
            <div className="p-2 border-b bg-muted/50">
              <span className="text-xs font-medium text-muted-foreground">Export Format</span>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {exportFormats.map((format) => {
                const Icon = format.icon;
                const isExporting = exporting === format.id;
                const isCopied = copied === format.id;
                
                return (
                  <div
                    key={format.id}
                    className="flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors"
                  >
                    <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm">{format.name}</div>
                      <div className="text-xs text-muted-foreground">{format.description}</div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button
                        onClick={() => handleExport(format.id, false)}
                        disabled={isExporting}
                        className="p-1.5 rounded hover:bg-primary/10 text-primary disabled:opacity-50"
                        title="Copy to clipboard"
                      >
                        {isCopied ? (
                          <Check className="w-4 h-4 text-green-500" />
                        ) : (
                          <FileText className="w-4 h-4" />
                        )}
                      </button>
                      <button
                        onClick={() => handleExport(format.id, true)}
                        disabled={isExporting}
                        className="p-1.5 rounded hover:bg-primary/10 text-primary disabled:opacity-50"
                        title="Download file"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

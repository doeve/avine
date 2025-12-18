import { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { 
  Plus, 
  FileText, 
  Copy, 
  Trash2, 
  Edit3, 
  Star,
  Eye,
  Code,
  Save,
  X,
  Loader2
} from 'lucide-react';
import { Button } from '@avine/ui';

interface Template {
  id: string;
  name: string;
  description: string | null;
  format: string;
  template: string;
  isDefault: boolean;
}

const sampleTrack = {
  title: 'Strobe',
  artist: 'deadmau5',
  startTime: 0,
  endTime: 456,
  confidence: 98,
};

const availableVariables = [
  { name: 'title', description: 'Track title' },
  { name: 'artist', description: 'Artist name' },
  { name: 'startTime', description: 'Start timestamp (formatted)' },
  { name: 'endTime', description: 'End timestamp (formatted)' },
  { name: 'startSeconds', description: 'Start time in seconds' },
  { name: 'endSeconds', description: 'End time in seconds' },
  { name: 'confidence', description: 'Match confidence %' },
  { name: 'index', description: 'Track number' },
];

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function renderTemplate(template: string, track: typeof sampleTrack, index: number = 1): string {
  return template
    .replace(/\{\{title\}\}/g, track.title)
    .replace(/\{\{artist\}\}/g, track.artist)
    .replace(/\{\{startTime\}\}/g, formatTime(track.startTime))
    .replace(/\{\{endTime\}\}/g, formatTime(track.endTime))
    .replace(/\{\{startSeconds\}\}/g, track.startTime.toString())
    .replace(/\{\{endSeconds\}\}/g, track.endTime.toString())
    .replace(/\{\{confidence\}\}/g, track.confidence.toString())
    .replace(/\{\{index\}\}/g, index.toString());
}

export function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const { data } = await api.get('/templates');
      setTemplates(data);
    } catch (error) {
      console.error('Failed to fetch templates', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNew = () => {
    const newTemplate: Template = {
      id: '',
      name: 'New Template',
      description: 'Custom export template',
      format: 'txt',
      template: '{{artist}} - {{title}}',
      isDefault: false,
    };
    setEditingTemplate(newTemplate);
    setIsCreating(true);
  };

  const handleSave = async (template: Template) => {
    try {
      if (isCreating) {
        const { data } = await api.post('/templates', {
          name: template.name,
          description: template.description,
          format: template.format,
          template: template.template,
        });
        setTemplates([...templates, data]);
      } else {
        const { data } = await api.put(`/templates/${template.id}`, {
          name: template.name,
          description: template.description,
          format: template.format,
          template: template.template,
        });
        setTemplates(templates.map(t => t.id === template.id ? data : t));
      }
    } catch (error) {
      console.error('Failed to save template', error);
    }
    setEditingTemplate(null);
    setIsCreating(false);
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/templates/${id}`);
      setTemplates(templates.filter(t => t.id !== id));
    } catch (error) {
      console.error('Failed to delete template', error);
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      await api.put(`/templates/${id}/default`);
      setTemplates(templates.map(t => ({
        ...t,
        isDefault: t.id === id,
      })));
    } catch (error) {
      console.error('Failed to set default template', error);
    }
  };

  const handleDuplicate = async (template: Template) => {
    try {
      const { data } = await api.post('/templates', {
        name: `${template.name} (Copy)`,
        description: template.description,
        format: template.format,
        template: template.template,
      });
      setTemplates([...templates, data]);
    } catch (error) {
      console.error('Failed to duplicate template', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Export Templates</h1>
          <p className="text-muted-foreground">
            Create custom formats for exporting your tracklists
          </p>
        </div>
        <Button onClick={handleCreateNew} className="gap-2">
          <Plus className="w-4 h-4" />
          New Template
        </Button>
      </div>

      {/* Template Editor Modal */}
      {editingTemplate && (
        <TemplateEditor
          template={editingTemplate}
          onSave={handleSave}
          onCancel={() => {
            setEditingTemplate(null);
            setIsCreating(false);
          }}
        />
      )}

      {/* Templates Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates.map((template) => (
          <div
            key={template.id}
            className="group p-5 rounded-xl border border-border bg-card/50 hover:bg-card hover:border-primary/50 transition-all duration-200"
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <FileText className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm flex items-center gap-1.5">
                    {template.name}
                    {template.isDefault && (
                      <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
                    )}
                  </h3>
                  <p className="text-xs text-muted-foreground">{template.description}</p>
                </div>
              </div>
            </div>

            {/* Preview */}
            <div className="p-3 rounded-lg bg-muted/30 font-mono text-xs text-muted-foreground mb-4 truncate">
              {renderTemplate(template.template, sampleTrack)}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => setEditingTemplate(template)}
                  className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                  title="Edit"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDuplicate(template)}
                  className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                  title="Duplicate"
                >
                  <Copy className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(template.id)}
                  className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              {!template.isDefault && (
                <button
                  onClick={() => handleSetDefault(template.id)}
                  className="text-xs text-muted-foreground hover:text-primary transition-colors"
                >
                  Set as default
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Variables Reference */}
      <div className="p-6 rounded-xl border border-border bg-card/30">
        <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
          <Code className="w-4 h-4 text-primary" />
          Available Variables
        </h3>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-3">
          {availableVariables.map((variable) => (
            <div key={variable.name} className="flex items-center gap-2">
              <code className="px-2 py-1 rounded bg-muted/50 text-xs text-primary font-mono">
                {`{{${variable.name}}}`}
              </code>
              <span className="text-xs text-muted-foreground">{variable.description}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Template Editor Component
function TemplateEditor({ 
  template, 
  onSave, 
  onCancel 
}: { 
  template: Template; 
  onSave: (template: Template) => void; 
  onCancel: () => void;
}) {
  const [name, setName] = useState(template.name);
  const [description, setDescription] = useState(template.description);
  const [templateContent, setTemplateContent] = useState(template.template);

  const preview = renderTemplate(templateContent, sampleTrack);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="w-full max-w-3xl mx-4 rounded-2xl border border-border bg-card shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30">
          <h2 className="font-semibold">
            {template.id ? 'Edit Template' : 'Create Template'}
          </h2>
          <button 
            onClick={onCancel}
            className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Name & Description */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Template Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="My Template"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <input
                type="text"
                value={description || ''}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="What this template is for"
              />
            </div>
          </div>

          {/* Template Editor */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <Code className="w-4 h-4 text-primary" />
              Template Format
            </label>
            <textarea
              value={templateContent}
              onChange={(e) => setTemplateContent(e.target.value)}
              className="w-full h-32 px-4 py-3 rounded-lg border border-border bg-muted/30 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
              placeholder="{{artist}} - {{title}}"
            />
          </div>

          {/* Live Preview */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <Eye className="w-4 h-4 text-primary" />
              Live Preview
            </label>
            <div className="p-4 rounded-lg border border-border bg-background font-mono text-sm">
              {preview || <span className="text-muted-foreground italic">Enter a template above</span>}
            </div>
          </div>

          {/* Variable Help */}
          <div className="flex flex-wrap gap-2">
            {availableVariables.slice(0, 4).map((v) => (
              <button
                key={v.name}
                onClick={() => setTemplateContent(templateContent + `{{${v.name}}}`)}
                className="px-2 py-1 rounded bg-muted/50 text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors font-mono"
              >
                + {`{{${v.name}}}`}
              </button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t border-border bg-muted/30">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button 
            onClick={() => onSave({ ...template, name, description, template: templateContent })}
            className="gap-2"
          >
            <Save className="w-4 h-4" />
            Save Template
          </Button>
        </div>
      </div>
    </div>
  );
}

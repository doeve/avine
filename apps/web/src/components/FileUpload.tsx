import { useState, useRef } from 'react';
import { Button } from '@avine/ui';
import { api } from '../lib/api';
import { Upload, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

export function FileUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setStatus('idle');
      setMessage('');
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setStatus('idle');
    setMessage('');

    const formData = new FormData();
    formData.append('file', file);

    try {
      const { data } = await api.post('/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      setStatus('success');
      setMessage(`Upload successful! Session ID: ${data.sessionId}`);
      setFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err: any) {
      setStatus('error');
      setMessage(err.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="w-full space-y-4">
      <div className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg border-muted-foreground/25 hover:bg-muted/50 transition-colors">
        <input
          type="file"
          className="hidden"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="audio/*"
          id="audio-upload"
        />
        <label
          htmlFor="audio-upload"
          className="flex flex-col items-center justify-center w-full h-full cursor-pointer"
        >
          {file ? (
            <div className="flex items-center gap-2 text-sm font-medium">
              <Upload className="w-4 h-4" />
              {file.name}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <Upload className="w-8 h-8" />
              <span className="text-sm">Click to select audio file</span>
            </div>
          )}
        </label>
      </div>

      {status === 'success' && (
        <div className="flex items-center gap-2 text-sm text-green-500 bg-green-500/10 p-3 rounded-md">
          <CheckCircle className="w-4 h-4" />
          {message}
        </div>
      )}

      {status === 'error' && (
        <div className="flex items-center gap-2 text-sm text-red-500 bg-red-500/10 p-3 rounded-md">
          <AlertCircle className="w-4 h-4" />
          {message}
        </div>
      )}

      <Button
        className="w-full"
        onClick={handleUpload}
        disabled={!file || uploading}
      >
        {uploading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Uploading...
          </>
        ) : (
          'Upload & Analyze'
        )}
      </Button>
    </div>
  );
}

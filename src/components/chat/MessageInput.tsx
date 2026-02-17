import { useState, useRef, KeyboardEvent } from 'react';
import { Send, PlusCircle, Smile, Image, FileText, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface MessageInputProps {
  onSend: (message: string, file?: { url: string; name: string; type: string }) => void;
  channelName?: string;
  disabled?: boolean;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export function MessageInput({ onSend, channelName, disabled }: MessageInputProps) {
  const [message, setMessage] = useState('');
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'file') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      alert('File size must be under 10MB');
      return;
    }

    setAttachedFile(file);
    setPopoverOpen(false);

    if (file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    } else {
      setPreviewUrl(null);
    }

    // Reset input
    e.target.value = '';
  };

  const removeAttachment = () => {
    setAttachedFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  };

  const uploadFile = async (file: File): Promise<{ url: string; name: string; type: string } | null> => {
    if (!user) return null;

    const ext = file.name.split('.').pop();
    const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const { error } = await supabase.storage
      .from('chat-attachments')
      .upload(path, file);

    if (error) {
      console.error('Upload error:', error);
      return null;
    }

    const { data: urlData } = supabase.storage
      .from('chat-attachments')
      .getPublicUrl(path);

    return {
      url: urlData.publicUrl,
      name: file.name,
      type: file.type,
    };
  };

  const handleSend = async () => {
    if ((!message.trim() && !attachedFile) || disabled) return;

    setUploading(true);
    let fileData: { url: string; name: string; type: string } | undefined;

    if (attachedFile) {
      const result = await uploadFile(attachedFile);
      if (result) {
        fileData = result;
      }
      removeAttachment();
    }

    onSend(message || '', fileData);
    setMessage('');
    setUploading(false);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="px-4 pb-6">
      {/* Attachment preview */}
      {attachedFile && (
        <div className="mb-2 flex items-center gap-2 bg-secondary rounded-lg p-2 max-w-xs">
          {previewUrl ? (
            <img src={previewUrl} alt="preview" className="w-16 h-16 object-cover rounded" />
          ) : (
            <div className="w-10 h-10 rounded bg-muted flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5 text-muted-foreground" />
            </div>
          )}
          <span className="text-sm text-foreground truncate flex-1">{attachedFile.name}</span>
          <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={removeAttachment}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}

      <div className="flex items-end gap-2 bg-input rounded-lg px-4 py-3">
        <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0 text-muted-foreground hover:text-foreground h-8 w-8"
              disabled={disabled || uploading}
            >
              <PlusCircle className="w-5 h-5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent side="top" align="start" className="w-48 p-1">
            <button
              onClick={() => imageInputRef.current?.click()}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-foreground rounded hover:bg-accent transition-colors"
            >
              <Image className="w-4 h-4 text-primary" />
              Upload Image
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-foreground rounded hover:bg-accent transition-colors"
            >
              <FileText className="w-4 h-4 text-primary" />
              Upload File
            </button>
          </PopoverContent>
        </Popover>

        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => handleFileSelect(e, 'image')}
        />
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.doc,.docx,.txt,.zip,.csv,.xls,.xlsx,.ppt,.pptx"
          className="hidden"
          onChange={(e) => handleFileSelect(e, 'file')}
        />

        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={`Message #${channelName || 'channel'}`}
          disabled={disabled || uploading}
          className="flex-1 bg-transparent border-none outline-none resize-none text-foreground placeholder:text-muted-foreground min-h-[24px] max-h-[120px] py-0"
          rows={1}
          style={{
            height: 'auto',
            overflow: message.split('\n').length > 4 ? 'auto' : 'hidden',
          }}
        />
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0 text-muted-foreground hover:text-foreground h-8 w-8"
          disabled={disabled}
        >
          <Smile className="w-5 h-5" />
        </Button>
        <Button
          onClick={handleSend}
          disabled={(!message.trim() && !attachedFile) || disabled || uploading}
          size="icon"
          className="shrink-0 h-8 w-8 bg-primary hover:bg-primary/90 disabled:opacity-50"
        >
          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </Button>
      </div>
    </div>
  );
}

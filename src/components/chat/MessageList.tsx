import { useEffect, useRef, useState } from 'react';
import { Message } from '@/hooks/useMessages';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { format, isToday, isYesterday } from 'date-fns';
import { FileText, Download } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface MessageListProps {
  messages: Message[];
  loading: boolean;
  currentUserId?: string;
}

function formatMessageDate(dateString: string) {
  const date = new Date(dateString);
  if (isToday(date)) {
    return `Today at ${format(date, 'h:mm a')}`;
  }
  if (isYesterday(date)) {
    return `Yesterday at ${format(date, 'h:mm a')}`;
  }
  return format(date, 'MMM d, yyyy h:mm a');
}

function FileAttachment({ filePath, fileName, fileType }: { filePath: string; fileName?: string | null; fileType?: string | null }) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function getUrl() {
      const { data, error } = await supabase.storage
        .from('chat-attachments')
        .createSignedUrl(filePath, 3600);

      if (!cancelled && data && !error) {
        setSignedUrl(data.signedUrl);
      }
    }

    getUrl();
    return () => { cancelled = true; };
  }, [filePath]);

  if (!signedUrl) {
    return (
      <div className="mt-1 w-20 h-20 rounded-lg bg-muted animate-pulse" />
    );
  }

  const isImage = fileType?.startsWith('image/');

  if (isImage) {
    return (
      <a href={signedUrl} target="_blank" rel="noopener noreferrer" className="mt-1 block">
        <img
          src={signedUrl}
          alt={fileName || 'image'}
          className="max-w-xs max-h-64 rounded-lg object-cover border border-border hover:opacity-90 transition-opacity"
        />
      </a>
    );
  }

  return (
    <a
      href={signedUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-1 inline-flex items-center gap-2 bg-secondary rounded-lg px-3 py-2 hover:bg-accent transition-colors"
    >
      <FileText className="w-5 h-5 text-primary shrink-0" />
      <span className="text-sm text-foreground truncate max-w-[200px]">
        {fileName || 'File'}
      </span>
      <Download className="w-4 h-4 text-muted-foreground shrink-0" />
    </a>
  );
}

export function MessageList({ messages, loading, currentUserId }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex gap-1">
          <div className="w-2 h-2 bg-primary rounded-full animate-pulse-dot" style={{ animationDelay: '0ms' }} />
          <div className="w-2 h-2 bg-primary rounded-full animate-pulse-dot" style={{ animationDelay: '200ms' }} />
          <div className="w-2 h-2 bg-primary rounded-full animate-pulse-dot" style={{ animationDelay: '400ms' }} />
        </div>
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-secondary flex items-center justify-center">
            <svg className="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <p className="text-muted-foreground">No messages yet</p>
          <p className="text-sm text-muted-foreground/70">Be the first to say hello!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin px-4 py-4">
      <div className="space-y-0">
        {messages.map((message, index) => {
          const isOwnMessage = message.user_id === currentUserId;
          const showAvatar = index === 0 || messages[index - 1].user_id !== message.user_id;
          
          return (
            <div
              key={message.id}
              className={`group py-0.5 ${showAvatar ? 'mt-4' : 'mt-0'} hover:bg-chat-message-hover px-2 -mx-2 rounded animate-message-in`}
            >
              <div className="flex gap-4">
                <div className="w-10 shrink-0">
                  {showAvatar && (
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={message.profile?.avatar_url || undefined} />
                      <AvatarFallback className="bg-accent text-accent-foreground">
                        {message.profile?.username?.[0]?.toUpperCase() || '?'}
                      </AvatarFallback>
                    </Avatar>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  {showAvatar && (
                    <div className="flex items-baseline gap-2 mb-0.5">
                      <span className={`font-medium text-sm ${isOwnMessage ? 'text-primary' : 'text-foreground'}`}>
                        {message.profile?.username || 'Unknown User'}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatMessageDate(message.created_at)}
                      </span>
                    </div>
                  )}
                  {message.content && (
                    <p className="text-foreground text-sm leading-relaxed break-words">
                      {message.content}
                    </p>
                  )}
                  {message.file_url && (
                    <FileAttachment
                      filePath={message.file_url}
                      fileName={message.file_name}
                      fileType={message.file_type}
                    />
                  )}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}

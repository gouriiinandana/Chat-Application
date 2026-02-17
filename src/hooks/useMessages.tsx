import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface Message {
  id: string;
  channel_id: string;
  user_id: string;
  content: string;
  created_at: string;
  file_url?: string | null;
  file_name?: string | null;
  file_type?: string | null;
  profile?: {
    username: string;
    avatar_url: string | null;
  };
}

export function useMessages(channelId: string | null) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchMessages = useCallback(async () => {
    if (!channelId) return;
    
    setLoading(true);
    const { data, error } = await supabase
      .from('messages')
      .select(`
        *,
        profile:profiles!messages_user_id_fkey(username, avatar_url)
      `)
      .eq('channel_id', channelId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching messages:', error);
    } else {
      setMessages(data?.map(msg => ({
        ...msg,
        profile: Array.isArray(msg.profile) ? msg.profile[0] : msg.profile
      })) || []);
    }
    setLoading(false);
  }, [channelId]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // Real-time subscription
  useEffect(() => {
    if (!channelId) return;

    const channel = supabase
      .channel(`messages-${channelId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `channel_id=eq.${channelId}`,
        },
        async (payload) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('username, avatar_url')
            .eq('user_id', payload.new.user_id)
            .single();

          const newMessage: Message = {
            ...payload.new as Message,
            profile: profile || { username: 'Unknown', avatar_url: null },
          };
          setMessages((prev) => [...prev, newMessage]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [channelId]);

  const sendMessage = async (content: string, file?: { url: string; name: string; type: string }) => {
    if (!user || !channelId || (!content.trim() && !file)) return;

    const { error } = await supabase.from('messages').insert({
      channel_id: channelId,
      user_id: user.id,
      content: content.trim(),
      file_url: file?.url || null,
      file_name: file?.name || null,
      file_type: file?.type || null,
    });

    if (error) {
      console.error('Error sending message:', error);
    }
  };

  return { messages, loading, sendMessage };
}

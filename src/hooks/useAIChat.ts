import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

export interface Message {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant';
  content: string;
  context_documents?: any[];
  citations?: any[];
  created_at: string;
}

export interface Conversation {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export function useAIChat() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(false);

  // Fetch conversations
  const fetchConversations = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setConversations(data || []);
    } catch (error: any) {
      console.error('Error fetching conversations:', error);
      toast({
        title: "Error",
        description: "Failed to load conversations",
        variant: "destructive",
      });
    }
  }, [user, toast]);

  // Fetch messages for current conversation
  const fetchMessages = useCallback(async (conversationId: string) => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      
      // Type-safe conversion of database response to Message interface
      const typedMessages: Message[] = (data || []).map(msg => ({
        id: msg.id,
        conversation_id: msg.conversation_id,
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
        context_documents: msg.context_documents as any[] || [],
        citations: msg.citations as any[] || [],
        created_at: msg.created_at,
      }));
      
      setMessages(typedMessages);
    } catch (error: any) {
      console.error('Error fetching messages:', error);
      toast({
        title: "Error",
        description: "Failed to load messages",
        variant: "destructive",
      });
    }
  }, [toast]);

  // Create new conversation
  const createConversation = useCallback(async (title?: string) => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('conversations')
        .insert({
          user_id: user.id,
          title: title || 'New Conversation',
        })
        .select()
        .single();

      if (error) throw error;
      
      setCurrentConversation(data);
      setMessages([]);
      await fetchConversations();
      
      return data;
    } catch (error: any) {
      console.error('Error creating conversation:', error);
      toast({
        title: "Error",
        description: "Failed to create conversation",
        variant: "destructive",
      });
      return null;
    }
  }, [user, toast, fetchConversations]);

  // Send message
  const sendMessage = useCallback(async (content: string) => {
    if (!user || !content.trim()) return;

    setLoading(true);

    try {
      // Create conversation if none exists
      let conversation = currentConversation;
      if (!conversation) {
        conversation = await createConversation();
        if (!conversation) {
          setLoading(false);
          return;
        }
      }

      // Add user message to database
      const { data: userMessageData, error: userError } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversation.id,
          role: 'user',
          content: content.trim(),
        })
        .select()
        .single();

      if (userError) throw userError;

      // Convert to typed message
      const userMessage: Message = {
        id: userMessageData.id,
        conversation_id: userMessageData.conversation_id,
        role: userMessageData.role as 'user',
        content: userMessageData.content,
        context_documents: userMessageData.context_documents as any[] || [],
        citations: userMessageData.citations as any[] || [],
        created_at: userMessageData.created_at,
      };

      // Update messages immediately
      setMessages(prev => [...prev, userMessage]);

      // Call AI assistant edge function
      const { data: aiResponse, error: aiError } = await supabase.functions.invoke(
        'ai-medical-assistant',
        {
          body: {
            message: content.trim(),
            conversation_id: conversation.id,
          },
        }
      );

      if (aiError) throw aiError;

      // Add AI response to database
      const { data: assistantMessageData, error: assistantError } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversation.id,
          role: 'assistant',
          content: aiResponse.response,
          context_documents: aiResponse.context_documents || [],
          citations: aiResponse.citations || [],
        })
        .select()
        .single();

      if (assistantError) throw assistantError;

      // Convert to typed message
      const assistantMessage: Message = {
        id: assistantMessageData.id,
        conversation_id: assistantMessageData.conversation_id,
        role: assistantMessageData.role as 'assistant',
        content: assistantMessageData.content,
        context_documents: assistantMessageData.context_documents as any[] || [],
        citations: assistantMessageData.citations as any[] || [],
        created_at: assistantMessageData.created_at,
      };

      // Update messages with AI response
      setMessages(prev => [...prev, assistantMessage]);

      // Update conversation title if it's the first message
      if (messages.length === 0) {
        const newTitle = content.length > 50 ? content.substring(0, 50) + '...' : content;
        await supabase
          .from('conversations')
          .update({ title: newTitle })
          .eq('id', conversation.id);
        
        setCurrentConversation(prev => prev ? { ...prev, title: newTitle } : null);
        await fetchConversations();
      }

    } catch (error: any) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to send message",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [user, currentConversation, createConversation, messages.length, toast, fetchConversations]);

  // Switch to a conversation
  const switchConversation = useCallback(async (conversationId: string) => {
    const conversation = conversations.find(c => c.id === conversationId);
    if (conversation) {
      setCurrentConversation(conversation);
      await fetchMessages(conversationId);
    }
  }, [conversations, fetchMessages]);

  // Initialize
  useEffect(() => {
    if (user) {
      fetchConversations();
    }
  }, [user, fetchConversations]);

  return {
    messages,
    conversations,
    currentConversation,
    loading,
    sendMessage,
    createConversation,
    switchConversation,
    fetchConversations,
  };
}
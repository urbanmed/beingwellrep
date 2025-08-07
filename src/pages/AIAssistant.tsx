import { useState, useRef, useEffect } from "react";
import { Send, Loader2, FileText, Calendar, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/contexts/AuthContext";
import { useAIChat } from "@/hooks/useAIChat";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

export default function AIAssistant() {
  const { user } = useAuth();
  const { messages, loading, sendMessage, currentConversation } = useAIChat();
  const [input, setInput] = useState("");
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput("");
    await sendMessage(userMessage);
  };

  const formatMessageContent = (content: string) => {
    // Split content by newlines and format properly
    return content.split('\n').map((line, index) => (
      <span key={index}>
        {line}
        {index < content.split('\n').length - 1 && <br />}
      </span>
    ));
  };

  const renderCitations = (citations: any[]) => {
    if (!citations || citations.length === 0) return null;

    return (
      <div className="mt-4 pt-3 border-t border-border">
        <p className="text-xs font-medium text-muted-foreground mb-2">Referenced Documents:</p>
        <div className="flex flex-wrap gap-2">
          {citations.map((citation, index) => (
            <Badge 
              key={index} 
              variant="secondary" 
              className="text-xs cursor-pointer hover:bg-secondary/80"
              onClick={() => {
                // Navigate to document detail if possible
                if (citation.report_id) {
                  window.open(`/reports/${citation.report_id}`, '_blank');
                }
              }}
            >
              <FileText className="h-3 w-3 mr-1" />
              {citation.title || citation.file_name || 'Document'}
              {citation.report_date && (
                <span className="ml-1 opacity-70">
                  ({format(new Date(citation.report_date), 'MMM yyyy')})
                </span>
              )}
            </Badge>
          ))}
        </div>
      </div>
    );
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="w-96">
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">Please log in to use the AI Assistant</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Page Header */}
      <div className="p-4 border-b border-border bg-card">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
              <User className="h-4 w-4 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-semibold text-foreground">AI Medical Assistant</h1>
              <p className="text-xs text-muted-foreground">
                Ask questions about your health records
              </p>
            </div>
          </div>
          {currentConversation && (
            <Badge variant="outline" className="text-xs">
              <Calendar className="h-3 w-3 mr-1" />
              {format(new Date(currentConversation.created_at), 'MMM d, yyyy')}
            </Badge>
          )}
        </div>
      </div>

      {/* Chat Messages */}
      <ScrollArea ref={scrollAreaRef} className="flex-1 p-4">
        <div className="space-y-4 pb-24">
          {messages.length === 0 && (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <User className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-lg font-medium text-foreground mb-2">
                Welcome to your AI Medical Assistant
              </h3>
              <p className="text-muted-foreground text-sm max-w-md mx-auto">
                I can help you understand your medical reports, track your health trends, 
                and answer questions about your uploaded documents.
              </p>
              <div className="mt-6 grid grid-cols-1 gap-2 max-w-sm mx-auto">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setInput("What are my latest lab results?")}
                >
                  What are my latest lab results?
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setInput("Summarize my recent medical visits")}
                >
                  Summarize my recent visits
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setInput("Are there any concerning trends in my health data?")}
                >
                  Any concerning trends?
                </Button>
              </div>
            </div>
          )}

          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "flex gap-3",
                message.role === "user" ? "justify-end" : "justify-start"
              )}
            >
              {message.role === "assistant" && (
                <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                  <User className="h-4 w-4 text-primary-foreground" />
                </div>
              )}
              
              <Card 
                className={cn(
                  "max-w-[80%]",
                  message.role === "user" 
                    ? "bg-primary text-primary-foreground" 
                    : "bg-card"
                )}
              >
                <CardContent className="p-3">
                  <div className="text-sm leading-relaxed">
                    {formatMessageContent(message.content)}
                  </div>
                  
                  {message.role === "assistant" && message.citations && (
                    renderCitations(message.citations)
                  )}
                  
                  <div className="mt-2 text-xs opacity-70">
                    {format(new Date(message.created_at), 'HH:mm')}
                  </div>
                </CardContent>
              </Card>

              {message.role === "user" && (
                <div className="w-8 h-8 bg-secondary rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                  <User className="h-4 w-4 text-secondary-foreground" />
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex gap-3 justify-start">
              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                <User className="h-4 w-4 text-primary-foreground" />
              </div>
              <Card className="bg-card">
                <CardContent className="p-3">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm text-muted-foreground">Thinking...</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input Form */}
      <div className="sticky bottom-0 p-4 bg-background border-t border-border">
        <form onSubmit={handleSubmit} className="flex gap-2 max-w-4xl mx-auto">
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about your health records..."
            disabled={loading}
            className="flex-1"
          />
          <Button type="submit" disabled={loading || !input.trim()}>
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
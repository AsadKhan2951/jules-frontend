import { useState, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Bot,
  X,
  Send,
  Sparkles,
  MessageCircle,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { Streamdown } from "streamdown";
import { useLocation } from "wouter";

interface Message {
  role: "user" | "assistant";
  content: string;
  catalogCreated?: {
    id: number;
    name: string;
    publicToken: string;
    previewUrl: string;
  } | null;
}

export default function JulesBotChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Hello! I'm JulesBot, your AI assistant for JULES. I can help you with:\n\n• **Product queries** - Ask about any product, collection, or catalog\n• **Business insights** - Get statistics and recommendations\n• **Create catalogs** - Just tell me what products to include!\n\nHow can I help you today?",
    },
  ]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [, setLocation] = useLocation();

  const chatMutation = trpc.julesBot.chat.useMutation({
    onSuccess: (data) => {
      const newMessage: Message = {
        role: "assistant",
        content: data.message,
        catalogCreated: data.catalogCreated,
      };
      setMessages((prev) => [...prev, newMessage]);
      
      if (data.catalogCreated) {
        toast.success(`Catalog "${data.catalogCreated.name}" created successfully!`);
      }
    },
    onError: (error) => {
      toast.error(error.message || "Failed to get response");
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "I apologize, I encountered an error. Please try again.",
        },
      ]);
    },
  });

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Listen for external open event from Dashboard CTA
  useEffect(() => {
    const handleOpenChat = () => setIsOpen(true);
    window.addEventListener('openJulesBotChat', handleOpenChat);
    return () => window.removeEventListener('openJulesBotChat', handleOpenChat);
  }, []);

  const handleSend = () => {
    if (!message.trim() || chatMutation.isPending) return;

    const userMessage: Message = { role: "user", content: message };
    setMessages((prev) => [...prev, userMessage]);
    
    const conversationHistory = messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    chatMutation.mutate({
      message,
      conversationHistory,
    });

    setMessage("");
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {/* Chat Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-6 right-6 z-50 p-4 rounded-full shadow-2xl transition-all duration-300 ${
          isOpen
            ? "bg-muted hover:bg-muted/80"
            : "bg-gradient-to-br from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600"
        }`}
      >
        {isOpen ? (
          <X className="h-6 w-6 text-foreground" />
        ) : (
          <div className="relative">
            <Bot className="h-6 w-6 text-white" />
            <div className="absolute -top-1 -right-1 p-1 rounded-full bg-emerald-500 animate-pulse">
              <Sparkles className="h-2 w-2 text-white" />
            </div>
          </div>
        )}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-50 w-96 max-w-[calc(100vw-3rem)] bg-card border border-border rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-5 duration-300">
          {/* Header */}
          <div className="bg-gradient-to-r from-violet-500/20 to-fuchsia-500/20 border-b border-border p-4">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="p-2 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500">
                  <Bot className="h-5 w-5 text-white" />
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-card" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">JulesBot</h3>
                <p className="text-xs text-muted-foreground">AI Assistant • Online</p>
              </div>
            </div>
          </div>

          {/* Messages */}
          <ScrollArea className="h-96 p-4" ref={scrollRef}>
            <div className="space-y-4">
              {messages.map((msg, index) => (
                <div
                  key={index}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                      msg.role === "user"
                        ? "bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white"
                        : "bg-muted text-foreground"
                    }`}
                  >
                    {msg.role === "assistant" ? (
                      <div className="prose prose-sm prose-invert max-w-none">
                        <Streamdown>{msg.content}</Streamdown>
                      </div>
                    ) : (
                      <p className="text-sm">{msg.content}</p>
                    )}
                    
                    {/* Catalog Created Card */}
                    {msg.catalogCreated && (
                      <div className="mt-3 p-3 rounded-xl bg-card/50 border border-border">
                        <div className="flex items-center gap-2 mb-2">
                          <Sparkles className="h-4 w-4 text-emerald-400" />
                          <span className="text-xs font-medium text-emerald-400">Catalog Created!</span>
                        </div>
                        <p className="text-sm font-medium mb-2">{msg.catalogCreated.name}</p>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs h-7"
                            onClick={() => {
                              setLocation(`/catalogs`);
                              setIsOpen(false);
                            }}
                          >
                            View Catalogs
                          </Button>
                          <Button
                            size="sm"
                            className="text-xs h-7 bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white border-0"
                            onClick={() => {
                              window.open(msg.catalogCreated!.previewUrl, '_blank');
                            }}
                          >
                            <ExternalLink className="h-3 w-3 mr-1" />
                            Preview
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              
              {/* Typing Indicator */}
              {chatMutation.isPending && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-2xl px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin text-violet-400" />
                      <span className="text-sm text-muted-foreground">JulesBot is thinking...</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Input */}
          <div className="border-t border-border p-4">
            <div className="flex gap-2">
              <Input
                ref={inputRef}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask JulesBot anything..."
                className="flex-1 bg-muted border-0 focus-visible:ring-violet-500"
                disabled={chatMutation.isPending}
              />
              <Button
                onClick={handleSend}
                disabled={!message.trim() || chatMutation.isPending}
                className="bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white border-0 hover:from-violet-600 hover:to-fuchsia-600"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2 text-center">
              Try: "Create a catalog with diamond products" or "Show me gold sets"
            </p>
          </div>
        </div>
      )}
    </>
  );
}

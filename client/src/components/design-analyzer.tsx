import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { analyzeDesign, chatWithAI } from "@/lib/openai";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";

export function DesignAnalyzer() {
  const [image, setImage] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<string>("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [chatMessage, setChatMessage] = useState("");
  const [chatHistory, setChatHistory] = useState<Array<{ role: string; content: string }>>([]);
  const [isChatting, setIsChatting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result?.toString().split(",")[1];
      if (base64) {
        setImage(base64);
        setIsAnalyzing(true);
        try {
          const result = await analyzeDesign(base64);
          setAnalysis(result);
          setChatHistory([{ role: "assistant", content: result }]);
        } catch (error) {
          console.error("Analysis failed:", error);
          setAnalysis("Failed to analyze the image. Please try again.");
        }
        setIsAnalyzing(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleChat = async () => {
    if (!chatMessage.trim()) return;

    setIsChatting(true);
    const newMessage = { role: "user", content: chatMessage };
    setChatHistory((prev) => [...prev, newMessage]);
    
    try {
      const response = await chatWithAI(chatMessage, analysis);
      setChatHistory((prev) => [...prev, { role: "assistant", content: response }]);
    } catch (error) {
      console.error("Chat failed:", error);
      setChatHistory((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, I couldn't process your message. Please try again." },
      ]);
    }
    
    setIsChatting(false);
    setChatMessage("");
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-4 space-y-4">
      <Card className="p-6">
        <div className="space-y-4">
          <h2 className="text-2xl font-bold">Design Analysis</h2>
          <div className="flex flex-col items-center gap-4">
            <Input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              ref={fileInputRef}
              className="hidden"
            />
            <Button
              onClick={() => fileInputRef.current?.click()}
              className="w-full max-w-sm"
              disabled={isAnalyzing}
            >
              {isAnalyzing ? "Analyzing..." : "Upload Design Image"}
            </Button>
            
            {image && (
              <Dialog>
                <DialogTrigger asChild>
                  <img
                    src={`data:image/jpeg;base64,${image}`}
                    alt="Uploaded design"
                    className="max-w-sm rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                  />
                </DialogTrigger>
                <DialogContent className="max-w-3xl">
                  <DialogHeader>
                    <DialogTitle>Design Image</DialogTitle>
                    <DialogDescription>
                      <img
                        src={`data:image/jpeg;base64,${image}`}
                        alt="Uploaded design"
                        className="w-full rounded-lg"
                      />
                    </DialogDescription>
                  </DialogHeader>
                </DialogContent>
              </Dialog>
            )}
          </div>

          {analysis && (
            <div className="mt-6 space-y-4">
              <h3 className="text-xl font-semibold">Analysis Results</h3>
              <ScrollArea className="h-[300px] rounded-md border p-4">
                <div className="whitespace-pre-wrap">{analysis}</div>
              </ScrollArea>

              <div className="space-y-4">
                <h3 className="text-xl font-semibold">Chat with AI Assistant</h3>
                <ScrollArea className="h-[300px] rounded-md border p-4">
                  <div className="space-y-4">
                    {chatHistory.map((msg, index) => (
                      <div
                        key={index}
                        className={`p-3 rounded-lg ${
                          msg.role === "user"
                            ? "bg-primary text-primary-foreground ml-8"
                            : "bg-muted mr-8"
                        }`}
                      >
                        {msg.content}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
                
                <div className="flex gap-2">
                  <Textarea
                    value={chatMessage}
                    onChange={(e) => setChatMessage(e.target.value)}
                    placeholder="Ask about the analysis..."
                    className="flex-1"
                  />
                  <Button
                    onClick={handleChat}
                    disabled={isChatting || !chatMessage.trim()}
                  >
                    {isChatting ? "Sending..." : "Send"}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

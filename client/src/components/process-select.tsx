import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";

interface ProcessSelectProps {
  processes: readonly string[];
  onAnalyze: (file: File, process: string) => void;
  isLoading: boolean;
}

export function ProcessSelect({ processes, onAnalyze, isLoading }: ProcessSelectProps) {
  const [selectedProcess, setSelectedProcess] = useState<string>("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <h3 className="font-medium">Select Manufacturing Process</h3>
        
        <Select value={selectedProcess} onValueChange={setSelectedProcess}>
          <SelectTrigger>
            <SelectValue placeholder="Choose a process..." />
          </SelectTrigger>
          <SelectContent>
            {processes.map((process) => (
              <SelectItem key={process} value={process}>
                {process.replace("_", " ").toUpperCase()}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button 
          className="w-full"
          disabled={!selectedProcess || !selectedFile || isLoading}
          onClick={() => selectedFile && onAnalyze(selectedFile, selectedProcess)}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Analyzing...
            </>
          ) : (
            'Analyze Model'
          )}
        </Button>
      </div>
    </Card>
  );
}

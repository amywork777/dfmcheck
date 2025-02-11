import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { manufacturingProcesses } from "@shared/schema";

interface ProcessSelectProps {
  processes: typeof manufacturingProcesses;
  onAnalyze: (process: typeof manufacturingProcesses[number]) => void;
  isLoading: boolean;
  disabled: boolean;
}

export function ProcessSelect({ processes, onAnalyze, isLoading, disabled }: ProcessSelectProps) {
  const [selectedProcess, setSelectedProcess] = useState<typeof manufacturingProcesses[number] | "">("");

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
          disabled={!selectedProcess || disabled || isLoading}
          onClick={() => selectedProcess && onAnalyze(selectedProcess)}
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
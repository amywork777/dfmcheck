import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Info } from "lucide-react";

interface GuidelinesUploadProps {
  onGuidelinesChange: (guidelines: string | undefined) => void;
}

export function GuidelinesUpload({ onGuidelinesChange }: GuidelinesUploadProps) {
  const [guidelines, setGuidelines] = useState<string>("");

  const handleGuidelinesChange = (value: string) => {
    setGuidelines(value);
    onGuidelinesChange(value.trim() ? value : undefined);
  };

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-blue-500 mt-1" />
          <div>
            <h3 className="font-medium mb-2">Custom Design Guidelines (Optional)</h3>
            <p className="text-sm text-muted-foreground">
              Optionally add your specific design requirements and manufacturing constraints. 
              Leave empty to use standard manufacturing guidelines.
            </p>
          </div>
        </div>

        <div className="grid gap-4">
          <Textarea
            value={guidelines}
            onChange={(e) => handleGuidelinesChange(e.target.value)}
            placeholder="Optional guidelines examples:
- Minimum wall thickness should be 2mm
- Maximum overhang angle 30 degrees
- All holes must be larger than 3mm
- Support structures required for overhangs"
            className="min-h-[200px] font-sans text-sm leading-relaxed"
          />

          {guidelines && (
            <Button
              variant="outline"
              onClick={() => handleGuidelinesChange("")}
              className="w-full"
            >
              Clear Guidelines
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
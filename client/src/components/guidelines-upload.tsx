import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Info, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface GuidelinesUploadProps {
  onGuidelinesChange: (guidelines: string | undefined) => void;
}

export function GuidelinesUpload({ onGuidelinesChange }: GuidelinesUploadProps) {
  const { toast } = useToast();
  const [guidelines, setGuidelines] = useState<string>("");
  const [fileName, setFileName] = useState<string | null>(null);

  const handleGuidelinesChange = (value: string) => {
    setGuidelines(value);
    onGuidelinesChange(value.trim() ? value : undefined);
  };

  const handleFileUpload = async (file: File) => {
    if (!file) return;

    if (file.type === 'application/pdf') {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const response = await fetch('/api/parse-pdf', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            content: Array.from(new Uint8Array(arrayBuffer))
          })
        });

        if (!response.ok) {
          throw new Error('Failed to parse PDF');
        }

        const { text } = await response.json();
        setFileName(file.name);
        handleGuidelinesChange(text);

        toast({
          title: "PDF Uploaded Successfully",
          description: `Guidelines extracted from ${file.name}`,
        });
      } catch (error) {
        console.error('PDF parsing error:', error);
        toast({
          title: "Error Processing PDF",
          description: "Failed to extract text from the PDF file",
          variant: "destructive"
        });
      }
    } else {
      toast({
        title: "Invalid File Type",
        description: "Please upload a PDF file",
        variant: "destructive"
      });
    }
  };

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-blue-500 mt-1" />
          <div>
            <h3 className="font-medium mb-2">Custom Design Guidelines</h3>
            <p className="text-sm text-muted-foreground">
              Add your specific design requirements and manufacturing constraints.
              Enter text directly or upload a PDF file containing your guidelines.
            </p>
          </div>
        </div>

        <div className="grid gap-4">
          <Textarea
            value={guidelines}
            onChange={(e) => handleGuidelinesChange(e.target.value)}
            placeholder="Example guidelines:
- Minimum wall thickness should be 2mm
- Maximum overhang angle 30 degrees
- All holes must be larger than 3mm
- Support structures required for overhangs"
            className="min-h-[200px] font-mono text-sm"
          />

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              className="relative"
              onClick={() => document.getElementById('pdf-upload')?.click()}
            >
              <Upload className="w-4 h-4 mr-2" />
              Upload PDF Guidelines
              <input
                id="pdf-upload"
                type="file"
                className="hidden"
                accept=".pdf"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleFileUpload(file);
                }}
              />
            </Button>
            {fileName && <span className="text-sm text-muted-foreground">Uploaded: {fileName}</span>}
          </div>

          {guidelines && (
            <Button
              variant="outline"
              onClick={() => {
                handleGuidelinesChange("");
                setFileName(null);
              }}
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
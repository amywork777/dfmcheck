import { useCallback, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { FileUpload } from "@/components/file-upload";
import { ProcessSelect } from "@/components/process-select";
import { manufacturingProcesses } from "@shared/schema";
import { analyzeGeometry } from "@/lib/geometry";
import { apiRequest } from "@/lib/queryClient";
import { Card } from "@/components/ui/card";
import { CheckCircle2 } from "lucide-react";
import { ModelViewer } from "@/components/model-viewer";

export default function Home() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileContent, setFileContent] = useState<string | null>(null);

  const analyzeMutation = useMutation({
    mutationFn: async ({ file, process }: { file: File, process: string }) => {
      try {
        console.log('Reading file:', file.name, 'size:', file.size);
        // Read file as array buffer first
        const arrayBuffer = await file.arrayBuffer();
        console.log('Array buffer size:', arrayBuffer.byteLength);

        // Convert to base64
        const base64 = btoa(
          new Uint8Array(arrayBuffer)
            .reduce((data, byte) => data + String.fromCharCode(byte), '')
        );

        console.log('Starting geometry analysis...');
        const report = analyzeGeometry(base64, process);
        console.log('Analysis complete');

        const response = await apiRequest("POST", "/api/analyze", {
          fileName: file.name,
          fileContent: base64,
          process,
          report
        });

        return await response.json();
      } catch (error) {
        console.error('Analysis error:', error);
        throw error;
      }
    },
    onSuccess: (data) => {
      setLocation(`/report/${data.id}`);
    },
    onError: (error) => {
      toast({
        title: "Analysis Failed",
        description: error instanceof Error ? error.message : "Failed to analyze file. Please try again.",
        variant: "destructive"
      });
    }
  });

  const handleAnalyze = useCallback(async (process: string) => {
    if (selectedFile) {
      analyzeMutation.mutate({ file: selectedFile, process });
    }
  }, [analyzeMutation, selectedFile]);

  const handleFileSelected = useCallback(async (file: File) => {
    if (file.name.toLowerCase().endsWith('.stl') || file.name.toLowerCase().endsWith('.step')) {
      try {
        // Check file size
        if (file.size > 50 * 1024 * 1024) { // 50MB limit
          toast({
            title: "File too large",
            description: "Please upload a file smaller than 50MB",
            variant: "destructive"
          });
          return false;
        }

        // Set selected file first
        setSelectedFile(file);

        // Read file as array buffer
        const arrayBuffer = await file.arrayBuffer();

        // Basic validation of STL format
        if (file.name.toLowerCase().endsWith('.stl') && arrayBuffer.byteLength < 84) {
          toast({
            title: "Invalid STL file",
            description: "The file appears to be corrupted or invalid",
            variant: "destructive"
          });
          return false;
        }

        // Convert to base64
        const base64 = btoa(
          new Uint8Array(arrayBuffer)
            .reduce((data, byte) => data + String.fromCharCode(byte), '')
        );

        setFileContent(base64);

        toast({
          title: "File uploaded successfully",
          description: `Selected file: ${file.name}`,
        });
        return true;
      } catch (error) {
        console.error('File reading error:', error);
        toast({
          title: "Error reading file",
          description: error instanceof Error ? error.message : "Failed to read the file",
          variant: "destructive"
        });
        return false;
      }
    }

    toast({
      title: "Invalid file type",
      description: "Please upload an STL or STEP file",
      variant: "destructive"
    });
    return false;
  }, [toast]);

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-4xl mx-auto py-12">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            DFM Analysis Tool
          </h1>
          <p className="text-muted-foreground mt-2">
            Upload your 3D model for instant manufacturability feedback
          </p>
        </div>

        <div className="space-y-8">
          <FileUpload
            onFileSelected={handleFileSelected}
            onFileUploaded={setSelectedFile}
            maxSize={10 * 1024 * 1024} // 10MB
            accept=".stl,.step"
          />

          {fileContent && (
            <Card className="p-6">
              <h3 className="font-medium mb-4">3D Preview</h3>
              <ModelViewer fileContent={fileContent} />
            </Card>
          )}

          {selectedFile && (
            <Card className="p-4 bg-green-50">
              <div className="flex items-center gap-2 text-green-700">
                <CheckCircle2 className="h-5 w-5" />
                <span>File ready: {selectedFile.name}</span>
              </div>
            </Card>
          )}

          <ProcessSelect
            processes={manufacturingProcesses}
            onAnalyze={handleAnalyze}
            isLoading={analyzeMutation.isPending}
            disabled={!selectedFile}
          />
        </div>
      </div>
    </div>
  );
}
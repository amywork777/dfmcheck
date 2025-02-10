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
import { CheckCircle2, Loader2 } from "lucide-react";
import { ModelViewer } from "@/components/model-viewer";
import type { DFMReport } from "@shared/schema";

export default function Home() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisReport, setAnalysisReport] = useState<DFMReport | null>(null);

  const analyzeMutation = useMutation({
    mutationFn: async ({ file, process }: { file: File; process: typeof manufacturingProcesses[number] }) => {
      const abortController = new AbortController();
      const timeoutId = setTimeout(() => abortController.abort(), 45000); // 45s timeout

      try {
        setAnalyzing(true);
        console.log('Reading file:', file.name, 'size:', file.size);

        const arrayBuffer = await file.arrayBuffer();
        console.log('Array buffer size:', arrayBuffer.byteLength);

        const base64 = btoa(
          new Uint8Array(arrayBuffer)
            .reduce((data, byte) => data + String.fromCharCode(byte), '')
        );

        console.log('Starting geometry analysis...');
        const report = analyzeGeometry(base64, process);
        setAnalysisReport(report);
        console.log('Analysis complete');

        const response = await apiRequest("POST", "/api/analyze", {
          fileName: file.name,
          fileContent: base64,
          process,
          report
        });

        return await response.json();
      } catch (error: any) {
        console.error('Analysis error:', error);
        if (error.name === 'AbortError' || error.message?.includes('timeout')) {
          throw new Error('Analysis timed out. The model might be too complex, try simplifying it first.');
        }
        if (error.message?.includes('save your STL file in binary format')) {
          throw new Error('Please save your STL file in binary format. Most 3D modeling software can export as binary STL.');
        }
        throw error;
      } finally {
        clearTimeout(timeoutId);
        setAnalyzing(false);
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

  const handleAnalyze = useCallback(async (process: typeof manufacturingProcesses[number]) => {
    if (selectedFile) {
      analyzeMutation.mutate({ file: selectedFile, process });
    }
  }, [analyzeMutation, selectedFile]);

  const handleFileSelected = useCallback(async (file: File) => {
    if (file.name.toLowerCase().endsWith('.stl')) {
      try {
        if (file.size > 50 * 1024 * 1024) {
          toast({
            title: "File too large",
            description: "Please upload a file smaller than 50MB",
            variant: "destructive"
          });
          return false;
        }

        setSelectedFile(file);
        const arrayBuffer = await file.arrayBuffer();

        if (arrayBuffer.byteLength < 84) {
          toast({
            title: "Invalid STL file",
            description: "The file appears to be corrupted or invalid",
            variant: "destructive"
          });
          return false;
        }

        const base64 = btoa(
          new Uint8Array(arrayBuffer)
            .reduce((data, byte) => data + String.fromCharCode(byte), '')
        );

        setFileContent(base64);
        setAnalysisReport(null);

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
      description: "Please upload an STL file",
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
            maxSize={50 * 1024 * 1024}
            accept=".stl"
          />

          {fileContent && (
            <Card className="p-6">
              <h3 className="font-medium mb-4">3D Preview</h3>
              <ModelViewer 
                fileContent={fileContent} 
                analysisReport={analysisReport}
              />
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
            isLoading={analyzeMutation.isPending || analyzing}
            disabled={!selectedFile}
          />

          {(analyzeMutation.isPending || analyzing) && (
            <Card className="p-4">
              <div className="flex items-center justify-center gap-2 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Analyzing model geometry...</span>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
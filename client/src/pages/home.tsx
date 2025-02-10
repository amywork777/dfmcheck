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
      const reader = new FileReader();

      const content = await new Promise<string>((resolve) => {
        reader.onload = (e) => {
          const base64 = (e.target?.result as string).split(',')[1];
          resolve(base64);
        };
        reader.readAsDataURL(file);
      });

      const report = analyzeGeometry(content, process);

      const response = await apiRequest("POST", "/api/analyze", {
        fileName: file.name,
        fileContent: content,
        process,
        report
      });

      return await response.json();
    },
    onSuccess: (data) => {
      setLocation(`/report/${data.id}`);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to analyze file. Please try again.",
        variant: "destructive"
      });
    }
  });

  const handleAnalyze = useCallback(async (process: string) => {
    if (selectedFile) {
      analyzeMutation.mutate({ file: selectedFile, process });
    }
  }, [analyzeMutation, selectedFile]);

  const handleFileSelected = useCallback((file: File) => {
    if (file.name.toLowerCase().endsWith('.stl') || file.name.toLowerCase().endsWith('.step')) {
      setSelectedFile(file);

      const reader = new FileReader();
      reader.onload = (e) => {
        const base64 = (e.target?.result as string).split(',')[1];
        setFileContent(base64);
      };
      reader.readAsDataURL(file);

      toast({
        title: "File uploaded successfully",
        description: `Selected file: ${file.name}`,
      });
      return true;
    }
    toast({
      title: "Invalid file",
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
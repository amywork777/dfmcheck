import { useCallback, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { FileUpload } from "@/components/file-upload";
import { ProcessSelect } from "@/components/process-select";
import { manufacturingProcesses } from "@shared/schema";
import { analyzeGeometry } from "@/lib/geometry";
import { apiRequest } from "@/lib/queryClient";

export default function Home() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const analyzeMutation = useMutation({
    mutationFn: async ({ file, process }: { file: File, process: string }) => {
      const reader = new FileReader();

      const content = await new Promise<string>((resolve) => {
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.readAsText(file);
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
    if (file.name.endsWith('.stl') || file.name.endsWith('.step')) {
      setSelectedFile(file);
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
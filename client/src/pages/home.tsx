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
import { analyzeImage } from "@/lib/image-analysis";
import type { ImageAnalysis } from "@shared/schema";

export default function Home() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisReport, setAnalysisReport] = useState<DFMReport | null>(null);
  const [imageAnalysis, setImageAnalysis] = useState<ImageAnalysis | null>(null);

  const analyzeMutation = useMutation({
    mutationFn: async ({ file, process }: { file: File; process: typeof manufacturingProcesses[number] }) => {
      const abortController = new AbortController();
      const timeoutId = setTimeout(() => abortController.abort(), 45000);

      try {
        setAnalyzing(true);
        console.log('Reading file:', file.name, 'size:', file.size);

        const arrayBuffer = await file.arrayBuffer();
        console.log('Array buffer size:', arrayBuffer.byteLength);

        const base64 = btoa(
          new Uint8Array(arrayBuffer)
            .reduce((data, byte) => data + String.fromCharCode(byte), '')
        );

        setFileContent(base64);

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
    const validExtensions = ['.stl', '.step', '.stp'];
    const extension = file.name.toLowerCase().slice(file.name.lastIndexOf('.'));

    if (validExtensions.includes(extension)) {
      try {
        if (file.size > 50 * 1024 * 1024) {
          toast({
            title: "File too large",
            description: "Please upload a file smaller than 50MB",
            variant: "destructive"
          });
          return false;
        }

        const arrayBuffer = await file.arrayBuffer();
        console.log('File loaded:', file.name, 'size:', arrayBuffer.byteLength);

        if (arrayBuffer.byteLength < 84) {
          toast({
            title: "Invalid file",
            description: "The file appears to be corrupted or invalid",
            variant: "destructive"
          });
          return false;
        }

        const base64 = btoa(
          new Uint8Array(arrayBuffer)
            .reduce((data, byte) => data + String.fromCharCode(byte), '')
        );

        setSelectedFile(file);
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
      description: "Please upload an STL or STEP file",
      variant: "destructive"
    });
    return false;
  }, [toast]);

  const handleImageSelected = useCallback(async (file: File) => {
    const validExtensions = ['.png', '.jpg', '.jpeg', '.webp'];
    const extension = file.name.toLowerCase().slice(file.name.lastIndexOf('.'));

    if (validExtensions.includes(extension)) {
      try {
        if (file.size > 10 * 1024 * 1024) {
          toast({
            title: "Image too large",
            description: "Please upload an image smaller than 10MB",
            variant: "destructive"
          });
          return false;
        }

        // Create image preview
        const reader = new FileReader();
        reader.onloadend = () => {
          setImagePreview(reader.result as string);
        };
        reader.readAsDataURL(file);

        // Perform image analysis
        const analysis = await analyzeImage(file);
        setImageAnalysis(analysis);
        setSelectedImage(file);

        toast({
          title: "Image analyzed successfully",
          description: `Analysis complete for: ${file.name}`,
        });
        return true;
      } catch (error) {
        console.error('Image processing error:', error);
        toast({
          title: "Error processing image",
          description: error instanceof Error ? error.message : "Failed to process the image",
          variant: "destructive"
        });
        return false;
      }
    }

    toast({
      title: "Invalid image type",
      description: "Please upload a PNG, JPEG, or WebP image",
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
            Upload your 3D model or image for instant manufacturability feedback
          </p>
        </div>

        <div className="space-y-8">
          <div className="grid md:grid-cols-2 gap-6">
            <FileUpload
              type="model"
              onFileSelected={handleFileSelected}
              onFileUploaded={setSelectedFile}
              maxSize={50 * 1024 * 1024}
              accept=".stl,.step,.stp"
            />
            <FileUpload
              type="image"
              onFileSelected={handleImageSelected}
              onFileUploaded={setSelectedImage}
              maxSize={10 * 1024 * 1024}
              accept=".png,.jpg,.jpeg,.webp"
            />
          </div>

          {fileContent && (
            <Card className="p-6">
              <h3 className="font-medium mb-4">3D Preview</h3>
              <ModelViewer 
                fileContent={fileContent} 
                analysisReport={analysisReport}
              />
            </Card>
          )}

          {imagePreview && (
            <Card className="p-6">
              <h3 className="font-medium mb-4">Image Preview</h3>
              <img 
                src={imagePreview} 
                alt="Uploaded design" 
                className="w-full h-auto rounded-lg"
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

          {selectedImage && (
            <Card className="p-4 bg-green-50">
              <div className="flex items-center gap-2 text-green-700">
                <CheckCircle2 className="h-5 w-5" />
                <span>Image ready: {selectedImage.name}</span>
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
          {imagePreview && imageAnalysis && (
            <Card className="p-6 space-y-6">
              <h3 className="font-medium mb-4">Design Analysis</h3>
              <img 
                src={imagePreview} 
                alt="Uploaded design" 
                className="w-full h-auto rounded-lg mb-6"
              />

              <div className="grid md:grid-cols-3 gap-6">
                <div>
                  <h4 className="font-medium mb-3">Design Considerations</h4>
                  <div className="space-y-4">
                    <div>
                      <h5 className="text-sm font-medium text-muted-foreground">Aesthetics</h5>
                      <ul className="list-disc list-inside text-sm space-y-1">
                        {imageAnalysis.designConsiderations.aesthetic.map((item, i) => (
                          <li key={i}>{item}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h5 className="text-sm font-medium text-muted-foreground">Ergonomics</h5>
                      <ul className="list-disc list-inside text-sm space-y-1">
                        {imageAnalysis.designConsiderations.ergonomics.map((item, i) => (
                          <li key={i}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-3">Manufacturing Considerations</h4>
                  <div className="space-y-4">
                    <div>
                      <h5 className="text-sm font-medium text-muted-foreground">Materials</h5>
                      <ul className="list-disc list-inside text-sm space-y-1">
                        {imageAnalysis.manufacturingConsiderations.materials.map((item, i) => (
                          <li key={i}>{item}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h5 className="text-sm font-medium text-muted-foreground">Processes</h5>
                      <ul className="list-disc list-inside text-sm space-y-1">
                        {imageAnalysis.manufacturingConsiderations.processes.map((item, i) => (
                          <li key={i}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-3">Quality Control</h4>
                  <div className="space-y-4">
                    <div>
                      <h5 className="text-sm font-medium text-muted-foreground">Testing Points</h5>
                      <ul className="list-disc list-inside text-sm space-y-1">
                        {imageAnalysis.qualityControl.testingPoints.map((item, i) => (
                          <li key={i}>{item}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h5 className="text-sm font-medium text-muted-foreground">Potential Defects</h5>
                      <ul className="list-disc list-inside text-sm space-y-1">
                        {imageAnalysis.qualityControl.potentialDefects.map((item, i) => (
                          <li key={i}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
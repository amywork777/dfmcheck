import { useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Upload } from "lucide-react";

interface FileUploadProps {
  onFileSelected: (file: File) => Promise<boolean>;
  onFileUploaded: (file: File) => void;
  maxSize: number;
  accept: string;
}

export function FileUpload({ onFileSelected, onFileUploaded, maxSize, accept }: FileUploadProps) {
  const handleFile = useCallback(async (file: File) => {
    if (file && file.size <= maxSize) {
      const success = await onFileSelected(file);
      if (success) {
        onFileUploaded(file);
      }
    }
  }, [maxSize, onFileSelected, onFileUploaded]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      void handleFile(file);
    }
  }, [handleFile]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      void handleFile(file);
    }
  }, [handleFile]);

  return (
    <Card className="p-8">
      <div
        className="border-2 border-dashed rounded-lg p-12 text-center relative"
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
      >
        <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
        <div className="space-y-2">
          <h3 className="font-medium">Drop your 3D model here</h3>
          <p className="text-sm text-muted-foreground">
            Upload a binary STL or STEP file
          </p>
          <p className="text-xs text-muted-foreground">
            Common CAD formats: .stl (binary), .step, .stp
          </p>
        </div>
        <input
          type="file"
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          accept={accept}
          onChange={handleChange}
        />
      </div>
    </Card>
  );
}
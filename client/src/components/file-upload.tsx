import { useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Upload } from "lucide-react";

interface FileUploadProps {
  onFileSelected: (file: File) => boolean;
  maxSize: number;
  accept: string;
}

export function FileUpload({ onFileSelected, maxSize, accept }: FileUploadProps) {
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.size <= maxSize && onFileSelected(file)) {
      // File accepted
    }
  }, [maxSize, onFileSelected]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.size <= maxSize && onFileSelected(file)) {
      // File accepted
    }
  }, [maxSize, onFileSelected]);

  return (
    <Card className="p-8">
      <div
        className="border-2 border-dashed rounded-lg p-12 text-center"
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
      >
        <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
        <div className="space-y-2">
          <h3 className="font-medium">Drop your 3D model here</h3>
          <p className="text-sm text-muted-foreground">
            Or click to select a file
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

import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import { DFMReport } from "@/components/dfm-report";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import type { Analysis } from "@shared/schema";

export default function Report() {
  const { id } = useParams();

  const { data: analysis, isLoading, error } = useQuery<Analysis>({
    queryKey: [`/api/analysis/${id}`],
    enabled: !!id
  });

  if (isLoading) {
    return (
      <div className="container max-w-4xl mx-auto py-12">
        <Skeleton className="h-8 w-64 mb-4" />
        <Skeleton className="h-[400px]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container max-w-4xl mx-auto py-12">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load analysis report. Please try again.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="container max-w-4xl mx-auto py-12">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No analysis found with ID: {id}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">DFM Analysis Report</h1>
        <p className="text-muted-foreground">
          Analysis results for <span className="font-medium">{analysis.fileName}</span>
        </p>
      </div>

      <DFMReport 
        report={analysis.report}
        fileName={analysis.fileName}
        process={analysis.process}
      />
    </div>
  );
}
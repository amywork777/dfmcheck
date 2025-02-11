import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { DFMReport } from "@/components/dfm-report";
import { AISummary } from "@/components/ai-summary";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/site-header";
import type { Analysis, DFMReport as DFMReportType } from "@shared/schema";
import { ModelViewer } from "@/components/model-viewer";
import { Card } from "@/components/ui/card";

export default function Report() {
  const { id } = useParams();

  const { data: analysis, isLoading, error } = useQuery<Analysis>({
    queryKey: [`/api/analysis/${id}`],
    enabled: !!id,
    retry: 1,
    staleTime: 0
  });

  if (isLoading) {
    return (
      <div className="container max-w-4xl mx-auto py-12">
        <div className="space-y-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-[400px]" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container max-w-4xl mx-auto py-12">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error instanceof Error ? error.message : 'Failed to load analysis report'}
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

  // Ensure the report matches our expected type
  const report = analysis.report as DFMReportType;
  if (!report || !report.wallThickness || !report.overhangs || !report.holeSize || !report.draftAngles) {
    return (
      <div className="container max-w-4xl mx-auto py-12">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Invalid analysis report structure
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="container max-w-4xl mx-auto py-8 px-4">
        <div className="space-y-4">
          <SiteHeader />

          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="outline" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <p className="text-muted-foreground">
              Analysis results for <span className="font-medium">{analysis.fileName}</span>
            </p>
          </div>

          <div className="space-y-8">
            <AISummary report={report} process={analysis.process} />

            <Card className="p-6">
              <h3 className="font-medium mb-4">3D Model Preview</h3>
              {analysis.fileContent ? (
                <ModelViewer 
                  fileContent={analysis.fileContent} 
                  analysisReport={report}
                />
              ) : (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>No model data available</AlertDescription>
                </Alert>
              )}
            </Card>

            <DFMReport
              report={report}
              fileName={analysis.fileName}
              process={analysis.process}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
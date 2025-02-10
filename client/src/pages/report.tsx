import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import { DFMReport } from "@/components/dfm-report";
import { Skeleton } from "@/components/ui/skeleton";

export default function Report() {
  const { id } = useParams();

  const { data: analysis, isLoading } = useQuery({
    queryKey: ["/api/analysis", id],
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

  if (!analysis) {
    return null;
  }

  return (
    <div className="container max-w-4xl mx-auto py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">DFM Analysis Report</h1>
        <p className="text-muted-foreground">
          Analysis results for {analysis.fileName}
        </p>
      </div>

      <DFMReport report={analysis.report} />
    </div>
  );
}

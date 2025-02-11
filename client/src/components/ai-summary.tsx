import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Loader2, Sparkles } from "lucide-react";
import { generateDFMSummary } from "@/lib/ai";
import type { DFMReport } from "@shared/schema";

interface AISummaryProps {
  report: DFMReport;
  process: string;
}

export function AISummary({ report, process }: AISummaryProps) {
  const [summary, setSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSummary() {
      try {
        setLoading(true);
        const aiSummary = await generateDFMSummary(report, process);
        setSummary(aiSummary);
      } catch (err) {
        setError("Failed to generate AI summary");
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    fetchSummary();
  }, [report, process]);

  if (error) {
    return null;
  }

  return (
    <Card className="p-6 bg-gradient-to-r from-blue-50 to-purple-50">
      <div className="flex items-start gap-3">
        <Sparkles className="h-5 w-5 text-blue-500 mt-1" />
        <div>
          <h3 className="font-medium mb-2">AI Design Insights</h3>
          {loading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Analyzing design...</span>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{summary}</p>
          )}
        </div>
      </div>
    </Card>
  );
}

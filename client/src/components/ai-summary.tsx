import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Loader2, Sparkles, CheckCircle2 } from "lucide-react";
import { generateDFMSummary } from "@/lib/ai";
import type { DFMReport } from "@shared/schema";

interface AISummaryProps {
  report: DFMReport;
  process: string;
}

export function AISummary({ report, process }: AISummaryProps) {
  const [insights, setInsights] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSummary() {
      try {
        setLoading(true);
        const aiSummary = await generateDFMSummary(report, process);
        if (aiSummary) {
          // Split the summary into bullet points if it contains them
          const points = aiSummary
            .split(/[•\-\*]\s+/)
            .filter(point => point.trim().length > 0);
          setInsights(points.length > 1 ? points : [aiSummary]);
        }
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
        <div className="flex-1">
          <h3 className="font-medium mb-3">AI Design Insights</h3>
          {loading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Analyzing design...</span>
            </div>
          ) : (
            <ul className="space-y-2">
              {insights.map((insight, index) => (
                <li key={index} className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500 mt-1 shrink-0" />
                  <span className="text-sm text-muted-foreground">{insight}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Card>
  );
}
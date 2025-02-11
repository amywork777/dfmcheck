import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Loader2, Sparkles, AlertTriangle } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { generateDFMSummary } from "@/lib/ai";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { DFMReport } from "@shared/schema";

interface AISummaryProps {
  report: DFMReport;
  process: string;
}

interface Insight {
  text: string;
  checked: boolean;
}

export function AISummary({ report, process }: AISummaryProps) {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSummary() {
      try {
        setLoading(true);
        setError(null);
        const aiSummary = await generateDFMSummary(report, process);

        if (!aiSummary) {
          setError("Unable to generate AI insights. Please check if the OpenAI API key is configured in the environment variables.");
          return;
        }

        // Split the summary into insights and create objects with checked state
        const points = aiSummary
          .split(/\*\*/)
          .filter(point => point.trim().length > 0)
          .map(text => ({ text: text.trim(), checked: false }));

        setInsights(points.length > 1 ? points : [{ text: aiSummary, checked: false }]);
      } catch (err: any) {
        setError(err?.message || "Failed to generate AI insights. Please try again later.");
        console.error('AI Summary Error:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchSummary();
  }, [report, process]);

  const toggleInsight = (index: number) => {
    setInsights(prevInsights => 
      prevInsights.map((insight, i) => 
        i === index ? { ...insight, checked: !insight.checked } : insight
      )
    );
  };

  if (error) {
    return (
      <Card className="p-6 bg-gradient-to-r from-blue-50 to-purple-50">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-yellow-500 mt-1" />
          <div className="flex-1">
            <h3 className="font-medium text-base mb-3">AI Design Insights</h3>
            <Alert variant="destructive" className="bg-red-50 border-red-200">
              <AlertDescription className="text-sm font-normal">
                {error}
              </AlertDescription>
            </Alert>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 bg-gradient-to-r from-blue-50 to-purple-50">
      <div className="flex items-start gap-3">
        <Sparkles className="h-5 w-5 text-blue-500 mt-1" />
        <div className="flex-1">
          <h3 className="font-medium text-base mb-3">AI Design Insights</h3>
          {loading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm font-normal">Analyzing design...</span>
            </div>
          ) : (
            <ul className="space-y-3">
              {insights.map((insight, index) => (
                <li key={index} className="flex items-start gap-3">
                  <Checkbox
                    id={`insight-${index}`}
                    checked={insight.checked}
                    onCheckedChange={() => toggleInsight(index)}
                    className="mt-1"
                  />
                  <label
                    htmlFor={`insight-${index}`}
                    className={`text-sm font-normal ${insight.checked ? 'text-muted-foreground line-through' : 'text-foreground'} cursor-pointer flex-1`}
                  >
                    {insight.text}
                  </label>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Card>
  );
}
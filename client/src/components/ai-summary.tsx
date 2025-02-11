import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Loader2, Sparkles } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { generateDFMSummary } from "@/lib/ai";
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
        const aiSummary = await generateDFMSummary(report, process);
        if (aiSummary) {
          // Split the summary into insights and create objects with checked state
          const points = aiSummary
            .split(/\*\*/)
            .filter(point => point.trim().length > 0)
            .map(text => ({ text: text.trim(), checked: false }));
          setInsights(points.length > 1 ? points : [{ text: aiSummary, checked: false }]);
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

  const toggleInsight = (index: number) => {
    setInsights(prevInsights => 
      prevInsights.map((insight, i) => 
        i === index ? { ...insight, checked: !insight.checked } : insight
      )
    );
  };

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
                    className={`text-sm ${insight.checked ? 'text-muted-foreground line-through' : 'text-foreground'} cursor-pointer flex-1`}
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
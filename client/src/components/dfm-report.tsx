import { Card } from "@/components/ui/card";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, XCircle } from "lucide-react";
import type { DFMReport as DFMReportType } from "@shared/schema";

interface DFMReportProps {
  report: DFMReportType;
}

export function DFMReport({ report }: DFMReportProps) {
  const sections = [
    { key: 'wallThickness', title: 'Wall Thickness' },
    { key: 'overhangs', title: 'Overhangs' },
    { key: 'holeSize', title: 'Hole Sizes' },
    { key: 'draftAngles', title: 'Draft Angles' }
  ];

  return (
    <div className="space-y-6">
      {sections.map(({ key, title }) => {
        const section = report[key as keyof DFMReportType];
        
        return (
          <Card key={key} className="p-6">
            <div className="flex items-center gap-2 mb-4">
              {section.pass ? (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              ) : (
                <XCircle className="h-5 w-5 text-red-500" />
              )}
              <h3 className="font-medium">{title}</h3>
            </div>

            {section.issues.length > 0 ? (
              <div className="space-y-2">
                {section.issues.map((issue, i) => (
                  <Alert key={i} variant={section.pass ? "default" : "destructive"}>
                    <AlertTitle>Issue {i + 1}</AlertTitle>
                    <AlertDescription>{issue}</AlertDescription>
                  </Alert>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No issues found</p>
            )}
          </Card>
        );
      })}
    </div>
  );
}

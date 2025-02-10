import { Card } from "@/components/ui/card";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, XCircle, Info } from "lucide-react";
import type { DFMReport as DFMReportType } from "@shared/schema";

const PROCESS_DESCRIPTIONS = {
  '3d_printing': 'Additive manufacturing process that builds parts layer by layer. Suitable for prototypes and complex geometries.',
  'cnc_machining': 'Subtractive manufacturing process using computer-controlled cutting tools. Ideal for precise metal parts.',
  'injection_molding': 'Process of injecting molten material into a mold cavity. Perfect for high-volume plastic parts.',
  'sheet_metal': 'Manufacturing process for creating parts from flat metal sheets. Good for enclosures and brackets.'
} as const;

const CONSTRAINT_DESCRIPTIONS = {
  wallThickness: 'Minimum material thickness required for structural integrity',
  overhangs: 'Unsupported features that extend beyond the base',
  holeSize: 'Minimum diameter and depth requirements for holes',
  draftAngles: 'Angled surfaces needed for proper part ejection'
} as const;

interface DFMReportProps {
  report: DFMReportType;
  fileName: string;
  process: string;
}

export function DFMReport({ report, fileName, process }: DFMReportProps) {
  const sections = [
    { key: 'wallThickness', title: 'Wall Thickness' },
    { key: 'overhangs', title: 'Overhangs' },
    { key: 'holeSize', title: 'Hole Sizes' },
    { key: 'draftAngles', title: 'Draft Angles' }
  ];

  const processName = process.replace(/_/g, ' ').toUpperCase();

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-blue-500 mt-1" />
          <div>
            <h3 className="font-medium mb-2">Manufacturing Process: {processName}</h3>
            <p className="text-sm text-muted-foreground">
              {PROCESS_DESCRIPTIONS[process as keyof typeof PROCESS_DESCRIPTIONS]}
            </p>
          </div>
        </div>
      </Card>

      {sections.map(({ key, title }) => {
        const section = report[key as keyof DFMReportType];

        return (
          <Card key={key} className="p-6">
            <div className="flex items-start gap-3">
              {section.pass ? (
                <CheckCircle2 className="h-5 w-5 text-green-500 mt-1" />
              ) : (
                <XCircle className="h-5 w-5 text-red-500 mt-1" />
              )}
              <div>
                <h3 className="font-medium mb-1">{title}</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {CONSTRAINT_DESCRIPTIONS[key as keyof typeof CONSTRAINT_DESCRIPTIONS]}
                </p>

                {section.issues.length > 0 ? (
                  <div className="space-y-3">
                    {section.issues.map((issue, i) => (
                      <Alert key={i} variant={section.pass ? "default" : "destructive"}>
                        <AlertTitle>Manufacturing Constraint {i + 1}</AlertTitle>
                        <AlertDescription>{issue}</AlertDescription>
                      </Alert>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-green-600">✓ Meets manufacturing requirements</p>
                )}
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
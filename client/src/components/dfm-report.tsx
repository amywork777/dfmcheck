import { Card } from "@/components/ui/card";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, XCircle, Info, Ruler } from "lucide-react";
import type { DFMReport as DFMReportType } from "@shared/schema";

const PROCESS_DESCRIPTIONS = {
  '3d_printing': 'Additive manufacturing process that builds parts layer by layer. Suitable for prototypes and complex geometries.',
  'cnc_machining': 'Subtractive manufacturing process using computer-controlled cutting tools. Ideal for precise metal parts.',
  'injection_molding': 'Process of injecting molten material into a mold cavity. Perfect for high-volume plastic parts.',
  'sheet_metal': 'Manufacturing process for creating parts from flat metal sheets. Good for enclosures and brackets.'
} as const;

const MIN_WALL_THICKNESS = {
  '3d_printing': 0.8,
  'injection_molding': 1.0,
  'cnc_machining': 1.2,
  'sheet_metal': 0.5
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

const formatProcessName = (process: string) => {
  return process
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

export function DFMReport({ report, fileName, process }: DFMReportProps) {
  const sections = [
    { key: 'wallThickness', title: 'Wall Thickness', icon: Ruler },
    { key: 'overhangs', title: 'Overhangs' },
    { key: 'holeSize', title: 'Hole Sizes' },
    { key: 'draftAngles', title: 'Draft Angles' }
  ];

  const processName = formatProcessName(process);
  const minThickness = MIN_WALL_THICKNESS[process as keyof typeof MIN_WALL_THICKNESS];

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-blue-500 mt-1" />
          <div>
            <h3 className="font-medium mb-2">Manufacturing Process: {processName}</h3>
            <p className="text-sm text-muted-foreground mb-2">
              {PROCESS_DESCRIPTIONS[process as keyof typeof PROCESS_DESCRIPTIONS]}
            </p>
            <div className="text-sm bg-muted p-2 rounded-md">
              <strong>Minimum Requirements:</strong>
              <ul className="list-disc list-inside mt-1">
                <li>Wall Thickness: {minThickness}mm minimum</li>
                <li>Overhang Angle: 45° maximum without supports</li>
                <li>Hole Size: 2mm minimum diameter</li>
              </ul>
            </div>
          </div>
        </div>
      </Card>

      {sections.map(({ key, title, icon: Icon }) => {
        const section = report[key as keyof DFMReportType];

        return (
          <Card key={key} className="p-6">
            <div className="flex items-start gap-3">
              {section.pass ? (
                <CheckCircle2 className="h-5 w-5 text-green-500 mt-1" />
              ) : (
                <XCircle className="h-5 w-5 text-red-500 mt-1" />
              )}
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-medium">{title}</h3>
                  {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  {CONSTRAINT_DESCRIPTIONS[key as keyof typeof CONSTRAINT_DESCRIPTIONS]}
                </p>

                {section.issues.length > 0 ? (
                  <div className="space-y-3">
                    {section.issues.map((issue, i) => {
                      const [measurement, ...recommendationParts] = issue.split(' - ');
                      const recommendation = recommendationParts.join(' - ');

                      return (
                        <Alert key={i} variant={section.pass ? "default" : "destructive"}>
                          <AlertTitle className="flex items-center gap-2">
                            <span className="font-mono bg-muted px-2 py-1 rounded text-sm">
                              {measurement}
                            </span>
                          </AlertTitle>
                          <AlertDescription className="mt-2">
                            <p>{recommendation}</p>
                          </AlertDescription>
                        </Alert>
                      );
                    })}
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
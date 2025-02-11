
import type { DFMReport } from "@shared/schema";

export async function generateDesignInsights(
  report: DFMReport,
  process: string,
  designGuidelines?: string
) {
  try {
    const customGuidelines = designGuidelines ? `\nCustom Guidelines:\n${designGuidelines}` : '';
    
    const prompt = `As a DFM expert, analyze this manufacturing report and provide insights focused on both standard requirements and custom guidelines. Output your analysis in plain text with each recommendation on a single line (no extra formatting). Your response should include three sections:

Manufacturing Report Details:
Process Type: ${process}
Custom Guidelines: ${customGuidelines || 'None provided'}
Full Report: ${JSON.stringify(report, null, 2)}

Summary of Critical Design Issues – include one-line statements for standard manufacturing requirements, custom guideline compliance, and key measurements/quantities.
Required Design Modifications – include one-line recommendations for specific changes needed, target measurements, and addressing custom guideline violations.
Process-Specific Guidelines – include one-line recommendations for ${process} specific guidance, material selection insights, and tooling considerations.`;

    // For now return a simulated analysis - in production this would call OpenAI API
    const materialRecs = report.materialRecommendations;
    
    let output = 'MATERIAL SELECTION\n\n';
    
    if (materialRecs?.recommended?.length) {
      materialRecs.recommended.forEach(mat => {
        output += `☐ ${mat} - recommended for optimal performance and manufacturability\n`;
      });
    }
    
    if (materialRecs?.notRecommended?.length) {
      materialRecs.notRecommended.forEach(mat => {
        output += `☐ Not recommended: ${mat} - may cause manufacturing issues\n`;
      });
    }
    
    if (report.customGuidelines?.validations?.length) {
      output += '\nCUSTOM GUIDELINES\n\n';
      report.customGuidelines.validations.forEach(rule => {
        output += `☐ ${rule.rule} - ${rule.pass ? 'Passed' : 'Failed'}\n`;
      });
    }
    
    output += '\nDESIGN ISSUES\n\n';
    output += `☐ Wall thickness: ${report.wallThickness.pass ? 'Passed' : 'Failed'} - ${report.wallThickness.issues.length} issues found\n`;
    output += `☐ Overhangs: ${report.overhangs.pass ? 'Passed' : 'Failed'} - ${report.overhangs.issues.length} issues found\n`;
    output += `☐ Hole size: ${report.holeSize.pass ? 'Passed' : 'Failed'} - ${report.holeSize.issues.length} issues found\n`;
    output += `☐ Draft angles: ${report.draftAngles.pass ? 'Passed' : 'Failed'} - ${report.draftAngles.issues.length} issues found\n`;
    
    output += '\nREQUIRED CHANGES\n\n';
    output += `☐ Increase wall thickness to minimum ${process === 'injection_molding' ? '2.5mm' : '1.2mm'} in marked areas\n`;
    output += `☐ Add support structures for any overhanging features\n`;
    output += `☐ Ensure hole dimensions meet minimum size requirements\n`;
    output += `☐ Verify draft angles are sufficient for part removal\n`;
    
    output += '\nPROCESS GUIDELINES\n\n';
    output += `☐ Follow ${process} tolerances: ±0.127mm for critical features\n`;
    output += `☐ Consider material flow and gate locations\n`;
    output += `☐ Review parting line placement and ejector pin locations\n`;
    
    return output;
  } catch (error) {
    console.error('Failed to generate insights:', error);
    throw new Error('Failed to generate AI insights');
  }
}

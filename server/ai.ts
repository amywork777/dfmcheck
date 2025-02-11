
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
    const customRules = report.customGuidelines?.validations || [];
    
    let output = 'MATERIAL RECOMMENDATIONS\n\n';
    
    if (materialRecs?.recommended?.length) {
      materialRecs.recommended.forEach(mat => {
        output += `Recommended material: ${mat}\n`;
      });
    }
    
    if (materialRecs?.notRecommended?.length) {
      materialRecs.notRecommended.forEach(mat => {
        output += `Not recommended material: ${mat}\n`;
      });
    }
    
    output += '\nCUSTOM GUIDELINES VALIDATION\n\n';
    customRules.forEach(rule => {
      output += `Design rule check: ${rule.rule} - ${rule.pass ? 'Passed' : 'Failed'}\n`;
    });
    
    output += 'Summary of Critical Design Issues\n\n';
    output += `Wall thickness check: ${report.wallThickness.pass ? 'Passed' : 'Failed'} - ${report.wallThickness.issues.length} issues found\n`;
    output += `Overhang check: ${report.overhangs.pass ? 'Passed' : 'Failed'} - ${report.overhangs.issues.length} issues found\n`;
    output += `Hole size check: ${report.holeSize.pass ? 'Passed' : 'Failed'} - ${report.holeSize.issues.length} issues found\n`;
    output += `Draft angle check: ${report.draftAngles.pass ? 'Passed' : 'Failed'} - ${report.draftAngles.issues.length} issues found\n`;
    
    output += '\nRequired Design Modifications\n\n';
    output += `Review and adjust wall thickness in areas marked as critical for ${process}\n`;
    output += `Implement support structures where needed based on geometry analysis\n`;
    output += `Modify hole dimensions to meet minimum size requirements\n`;
    output += `Adjust draft angles to ensure proper part removal\n`;
    
    output += '\nProcess-Specific Guidelines\n\n';
    output += `Follow ${process} specific tolerances and surface finish requirements\n`;
    output += `Consider material properties and their impact on manufacturability\n`;
    output += `Review tooling access and fixturing requirements\n`;
    
    return output;
  } catch (error) {
    console.error('Failed to generate insights:', error);
    throw new Error('Failed to generate AI insights');
  }
}

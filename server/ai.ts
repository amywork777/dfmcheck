import type { DFMReport } from "@shared/schema";

export async function generateDesignInsights(
  report: DFMReport,
  process: string,
  designGuidelines?: string
) {
  try {
    const customGuidelines = designGuidelines ? `\nCustom Guidelines:\n${designGuidelines}` : '';

    const prompt = `As a DFM expert, analyze the following manufacturing report and provide insights focused on both standard requirements and custom guidelines. Structure your response as follows:

Manufacturing Report Details:
Process Type: ${process}
Custom Guidelines: ${customGuidelines || 'None provided'}
Full Report: ${JSON.stringify(report, null, 2)}

• Summary of Critical Design Issues

Analyze standard manufacturing requirements
Evaluate custom guideline compliance
Highlight key measurements and quantities

• Required Design Modifications

List specific changes needed
Include target measurements
Address custom guideline violations

• Process-Specific Guidelines

Provide ${process} specific recommendations
Offer material selection insights
Include tooling considerations

Use the provided data from the report to detail your analysis, recommendations, and guidelines in a clear, structured format.`;

    // For now return a simulated analysis - in production this would call OpenAI API
    const materialRecs = report.materialRecommendations;

    let output = '• Summary of Critical Design Issues\n\n';

    // Add standard manufacturing analysis
    output += 'Standard Manufacturing Requirements:\n';
    output += `Wall thickness analysis ${report.wallThickness.pass ? 'passed' : 'failed'} with ${report.wallThickness.issues.length} issues identified. `;
    output += `Overhang analysis ${report.overhangs.pass ? 'passed' : 'failed'} with ${report.overhangs.issues.length} issues found. `;
    output += `Hole size requirements ${report.holeSize.pass ? 'passed' : 'failed'}. `;
    output += `Draft angle analysis ${report.draftAngles.pass ? 'passed' : 'failed'}.\n\n`;

    // Add custom guidelines compliance
    if (report.customGuidelines?.validations?.length) {
      output += 'Custom Guidelines Compliance:\n';
      report.customGuidelines.validations.forEach(rule => {
        output += `${rule.rule}: ${rule.pass ? 'Compliant' : 'Non-compliant'}. `;
      });
      output += '\n\n';
    }

    // Add measurements and quantities
    output += 'Key Measurements and Quantities:\n';
    output += `Total wall thickness issues: ${report.wallThickness.issues.length}\n`;
    output += `Total overhang issues: ${report.overhangs.issues.length}\n\n`;

    // Add required modifications
    output += '• Required Design Modifications\n\n';
    if (report.wallThickness.issues.length > 0) {
      output += 'Wall Thickness Modifications:\n';
      output += `- Adjust wall thickness to minimum ${process === 'injection_molding' ? '2.5mm' : '1.2mm'} in critical areas\n`;
    }
    if (report.overhangs.issues.length > 0) {
      output += 'Overhang Modifications:\n';
      output += '- Implement support structures where needed based on geometry analysis\n';
    }
    output += '\n';

    // Add process guidelines
    output += '• Process-Specific Guidelines\n\n';
    output += `${process.charAt(0).toUpperCase() + process.slice(1)} Process Recommendations:\n`;
    output += `- Maintain tolerances of ±0.127mm for critical features\n`;
    output += '- Consider material flow patterns and optimize gate locations\n';
    output += '- Ensure proper tooling access and review parting line placement\n\n';

    // Add material recommendations
    if (materialRecs) {
      output += 'Material Selection Guidelines:\n';
      if (materialRecs.recommended?.length) {
        output += `- Recommended materials: ${materialRecs.recommended.join(', ')}\n`;
      }
      if (materialRecs.notRecommended?.length) {
        output += `- Materials to avoid: ${materialRecs.notRecommended.join(', ')}\n`;
      }
    }

    return output;
  } catch (error) {
    console.error('Failed to generate insights:', error);
    throw new Error('Failed to generate AI insights');
  }
}
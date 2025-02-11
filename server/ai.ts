
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

Use the provided data from the report to detail your analysis, recommendations, and guidelines in a paragraph format. Ensure to incorporate any custom guidelines in your analysis and recommendations.`;

    // For now return a simulated analysis - in production this would call OpenAI API
    const materialRecs = report.materialRecommendations;
    
    // For this example, we'll return a simulated structured response
    let output = 'SUMMARY OF CRITICAL DESIGN ISSUES\n\n';
    
    // Add material recommendations
    output += 'Material Selection:\n';
    if (materialRecs?.recommended?.length) {
      output += `The following materials are recommended for optimal performance: ${materialRecs.recommended.join(', ')}. `;
    }
    if (materialRecs?.notRecommended?.length) {
      output += `These materials should be avoided: ${materialRecs.notRecommended.join(', ')}.\n\n`;
    }
    
    // Add design issues
    output += 'Design Analysis:\n';
    output += `Wall thickness analysis ${report.wallThickness.pass ? 'passed' : 'failed'} with ${report.wallThickness.issues.length} issues identified. `;
    output += `Overhang analysis ${report.overhangs.pass ? 'passed' : 'failed'} with ${report.overhangs.issues.length} issues found. `;
    output += `Hole size requirements ${report.holeSize.pass ? 'passed' : 'failed'}. `;
    output += `Draft angle analysis ${report.draftAngles.pass ? 'passed' : 'failed'}.\n\n`;
    
    // Add custom guidelines if present
    if (report.customGuidelines?.validations?.length) {
      output += 'Custom Guidelines Compliance:\n';
      report.customGuidelines.validations.forEach(rule => {
        output += `${rule.rule} - ${rule.pass ? 'Compliant' : 'Non-compliant'}. `;
      });
      output += '\n\n';
    }
    
    // Add required modifications
    output += 'REQUIRED DESIGN MODIFICATIONS\n\n';
    output += `Wall thickness should be adjusted to a minimum of ${process === 'injection_molding' ? '2.5mm' : '1.2mm'} in critical areas. `;
    output += 'Support structures should be implemented where needed based on geometry analysis. ';
    output += 'All holes should meet minimum size requirements for manufacturing. ';
    output += 'Draft angles must be sufficient for proper part removal.\n\n';
    
    // Add process guidelines
    output += 'PROCESS-SPECIFIC GUIDELINES\n\n';
    output += `For ${process}, maintain tolerances of ±0.127mm for critical features. `;
    output += 'Consider material flow patterns and optimize gate locations for uniform filling. ';
    output += 'Ensure proper tooling access and review parting line placement for optimal manufacturing results.\n';
    
    return output;
  } catch (error) {
    console.error('Failed to generate insights:', error);
    throw new Error('Failed to generate AI insights');
  }
}

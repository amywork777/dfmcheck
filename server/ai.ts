
import type { DFMReport } from "@shared/schema";

export async function generateDesignInsights(
  report: DFMReport,
  process: string,
  designGuidelines?: string
) {
  try {
    const customGuidelines = designGuidelines ? `\nCustom Guidelines:\n${designGuidelines}` : '';
    
    const prompt = `Analyze this manufacturing report for ${process} process with the following details:
    
    Process Type: ${process}
    Custom Guidelines: ${customGuidelines || 'None provided'}
    Full Report: ${JSON.stringify(report, null, 2)}
    
    Consider all aspects including material compatibility, design rules, and manufacturing constraints.
    Provide a comprehensive analysis focusing on manufacturability.`;

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
    
    output += '\nSTANDARD MANUFACTURING CHECKS\n\n';
    
    // Each check on its own line for individual checkboxes
    output += `Wall Thickness: ${report.wallThickness.pass ? 'Passed' : 'Failed'} standard requirements\n`;
    output += `Overhangs: ${report.overhangs.pass ? 'Passed' : 'Failed'} standard requirements\n`;
    output += `Hole Size: ${report.holeSize.pass ? 'Passed' : 'Failed'} standard requirements\n`;
    output += `Draft Angles: ${report.draftAngles.pass ? 'Passed' : 'Failed'} standard requirements\n`;
    
    output += '\nRECOMMENDATIONS\n\n';
    output += `Review wall thickness in critical areas to meet ${process} requirements\n`;
    output += `Ensure proper support structures are considered for manufacturing\n`;
    output += `Optimize hole dimensions according to process constraints\n`;
    output += `Verify draft angles for easy part removal\n`;
    
    return output;
  } catch (error) {
    console.error('Failed to generate insights:', error);
    throw new Error('Failed to generate AI insights');
  }
}

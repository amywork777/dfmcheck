
import type { DFMReport } from "@shared/schema";

export async function generateDesignInsights(
  report: DFMReport,
  process: string,
  designGuidelines?: string
) {
  try {
    const customGuidelines = designGuidelines ? `\nCustom Guidelines:\n${designGuidelines}` : '';
    
    const prompt = `Analyze this 3D printing/manufacturing report for ${process} process:
    ${JSON.stringify(report, null, 2)}${customGuidelines}
    
    Provide a detailed analysis of manufacturing issues and recommendations.`;

    // For now return a basic analysis - in production this would call OpenAI API
    return `### Critical Design Issues:
- Wall Thickness: ${report.wallThickness.pass ? 'Passed' : 'Failed'} standard requirements
- Overhangs: ${report.overhangs.pass ? 'Passed' : 'Failed'} standard requirements
- Hole Size: ${report.holeSize.pass ? 'Passed' : 'Failed'} standard requirements
- Draft Angles: ${report.draftAngles.pass ? 'Passed' : 'Failed'} standard requirements

### Recommendations:
- Review wall thickness in critical areas
- Ensure proper support structures
- Optimize hole dimensions for manufacturing
- Consider draft angles for easy part removal`;
  } catch (error) {
    console.error('Failed to generate insights:', error);
    throw new Error('Failed to generate AI insights');
  }
}

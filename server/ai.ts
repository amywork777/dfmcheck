import type { DFMReport } from "@shared/schema";

export async function generateDesignInsights(
  report: DFMReport,
  process: string,
  designGuidelines?: string
) {
  try {
    const customGuidelines = designGuidelines ? `\nCustom Guidelines:\n${designGuidelines}` : '';

    const prompt = `As a DFM expert, analyze this manufacturing report and provide detailed geometric modifications with clear explanations. Structure your response as follows:

Brief Status (2-3 lines maximum):
- Quick overview of critical violations
- Most urgent geometry changes needed

Geometric Modifications (Focus here):
For each issue, provide:
1. Exact geometric changes needed
   - Specific dimensions and tolerances
   - Location of modifications
   - Step-by-step modification instructions
2. Why this change is necessary
   - Manufacturing implications
   - Performance impact
   - Cost considerations
3. Implementation guidance
   - CAD modification approach
   - Order of operations
   - Verification steps

Process: ${process}
Custom Guidelines: ${customGuidelines || 'None provided'}
Full Report: ${JSON.stringify(report, null, 2)}

Focus on specific, actionable geometry changes. For each modification, explain both HOW to make the change and WHY it's necessary.`;

    // For now return a simulated analysis - in production this would call OpenAI API
    const materialRecs = report.materialRecommendations;

    let output = '• Brief Status\n\n';

    // Very concise summary
    output += `${report.wallThickness.pass ? 'PASSED' : 'FAILED'} wall thickness (${report.wallThickness.issues.length} issues). `;
    output += `${report.overhangs.pass ? 'PASSED' : 'FAILED'} overhangs (${report.overhangs.issues.length} issues).\n\n`;

    // Detailed geometric modifications
    output += '• Required Geometric Changes\n\n';

    if (report.wallThickness.issues.length > 0) {
      output += '1. Wall Thickness Modifications:\n\n';
      output += 'What to Change:\n';
      output += `- Increase wall thickness to ${process === 'injection_molding' ? '2.5mm' : '1.2mm'} minimum\n`;
      output += '- Add 3mm radius fillets at all interior corners\n';
      output += '- Implement 2.0mm thick reinforcement ribs (height = 3x wall thickness)\n';

      output += '\nWhere to Apply:\n';
      output += '- Focus on thin-wall regions identified in analysis\n';
      output += '- Add ribs parallel to primary load direction\n';
      output += '- Place fillets at high-stress intersections\n';

      output += '\nWhy These Changes:\n';
      output += '- Prevents warping and sink marks during manufacturing\n';
      output += '- Improves material flow and reduces internal stresses\n';
      output += '- Ensures structural integrity while minimizing material usage\n\n';
    }

    if (report.overhangs.issues.length > 0) {
      output += '2. Overhang Modifications:\n\n';
      output += 'What to Change:\n';
      output += '- Add 45° chamfers to overhanging edges\n';
      output += '- Implement 2.5mm thick support gussets\n';
      output += '- Modify angles to exceed 60° from horizontal\n';

      output += '\nWhere to Apply:\n';
      output += '- Target unsupported overhangs longer than 5mm\n';
      output += '- Place gussets at 30mm intervals along lengthy overhangs\n';
      output += '- Focus on downward-facing surfaces\n';

      output += '\nWhy These Changes:\n';
      output += '- Eliminates need for temporary supports\n';
      output += '- Reduces post-processing time and cost\n';
      output += '- Improves surface quality of final part\n\n';
    }

    if (!report.draftAngles.pass) {
      output += '3. Draft Angle Improvements:\n\n';
      output += 'What to Change:\n';
      output += '- Increase all vertical walls to 3° minimum draft\n';
      output += '- Add 5° draft for textured surfaces\n';
      output += '- Implement variable draft for deep features\n';

      output += '\nWhere to Apply:\n';
      output += '- All surfaces parallel to pull direction\n';
      output += '- Deep pockets and ribs (add 1° per 25mm depth)\n';
      output += '- External textured surfaces\n';

      output += '\nWhy These Changes:\n';
      output += '- Ensures clean part ejection from mold\n';
      output += '- Reduces tool wear and maintenance costs\n';
      output += '- Improves surface finish quality\n\n';
    }

    output += '• Implementation Steps\n\n';
    output += '1. Start with Critical Features:\n';
    output += '   - Open CAD model and create backup\n';
    output += '   - Identify thin walls using thickness analysis\n';
    output += '   - Begin with most severe violations\n\n';

    output += '2. Modification Order:\n';
    output += '   - First: Adjust base wall thicknesses\n';
    output += '   - Second: Add reinforcement features\n';
    output += '   - Third: Implement draft angles\n';
    output += '   - Finally: Add finishing features (fillets, chamfers)\n\n';

    output += '3. Verification:\n';
    output += '   - Rerun thickness analysis after each major change\n';
    output += '   - Check for introduced interference\n';
    output += '   - Validate changes meet functional requirements\n';
    output += '   - Confirm manufacturability with process simulation\n';

    return output;
  } catch (error) {
    console.error('Failed to generate insights:', error);
    throw new Error('Failed to generate AI insights');
  }
}
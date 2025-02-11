import type { DFMReport } from "@shared/schema";

export async function generateDesignInsights(
  report: DFMReport,
  process: string,
  designGuidelines?: string
) {
  try {
    const customGuidelines = designGuidelines ? `\nCustom Guidelines:\n${designGuidelines}` : '';

    const prompt = `As a DFM expert, analyze this manufacturing report and provide detailed design recommendations. Structure your response as follows:

Manufacturing Report Details:
Process Type: ${process}
Custom Guidelines: ${customGuidelines || 'None provided'}
Full Report: ${JSON.stringify(report, null, 2)}

• Brief Summary (Keep this section short)
- Quick overview of critical violations
- Key measurements that need attention
${customGuidelines ? '- Compliance status with custom guidelines' : ''}

• Detailed Design Recommendations (Focus on this section)
Provide specific, measurable improvements:
- Wall thickness optimizations with exact target values
- Support structure placement and modifications
- Draft angle improvements
- Custom guideline compliance solutions
Include the reasoning behind each recommendation

• Manufacturing Strategy
For ${process}:
- Optimal part orientation and setup
- Material selection guidelines
- Tooling requirements and considerations
- Quality control recommendations
- Risk mitigation strategies

• Implementation Roadmap
- Prioritized list of changes
- Expected impact of each modification
- Testing and validation steps
- Critical quality checkpoints

Focus on actionable recommendations over analysis. Provide specific measurements, tolerances, and implementation steps.`;

    // For now return a simulated analysis - in production this would call OpenAI API
    const materialRecs = report.materialRecommendations;

    let output = '• Brief Summary\n\n';

    // Concise summary of critical issues
    output += `${report.wallThickness.pass ? 'PASSED' : 'FAILED'} wall thickness (${report.wallThickness.issues.length} issues). `;
    output += `${report.overhangs.pass ? 'PASSED' : 'FAILED'} overhangs (${report.overhangs.issues.length} issues). `;
    output += `${report.holeSize.pass ? 'PASSED' : 'FAILED'} hole sizes. `;
    output += `${report.draftAngles.pass ? 'PASSED' : 'FAILED'} draft angles.\n\n`;

    if (report.customGuidelines?.validations?.length) {
      output += 'Custom Guidelines: ';
      report.customGuidelines.validations.forEach(rule => {
        output += `${rule.rule} (${rule.pass ? 'PASSED' : 'FAILED'}), `;
      });
      output += '\n\n';
    }

    // Detailed recommendations section
    output += '• Detailed Design Recommendations\n\n';

    if (report.wallThickness.issues.length > 0) {
      output += 'Wall Thickness Optimization:\n';
      output += `- Target minimum thickness: ${process === 'injection_molding' ? '2.5mm' : '1.2mm'} in critical areas\n`;
      output += '- Add reinforcement ribs (height = 3x wall thickness) at high-stress points\n';
      output += '- Implement gradual thickness transitions (max 3:1 ratio)\n';
      output += '- Add 1.5mm radius fillets at intersections\n';
      output += '- Consider core-outs to maintain uniform wall thickness\n';
      output += 'Reasoning: These changes will improve material flow, reduce sink marks, and prevent warpage.\n\n';
    }

    if (report.overhangs.issues.length > 0) {
      output += 'Support Structure Optimization:\n';
      output += '- Add 45° chamfers on overhanging features\n';
      output += '- Implement self-supporting angles (>60° from horizontal)\n';
      output += '- Add gussets (thickness = base wall thickness) for stability\n';
      output += '- Optimize build orientation to minimize supports\n';
      output += '- Consider splitting parts to eliminate critical overhangs\n';
      output += 'Reasoning: These modifications will reduce support material, improve surface finish, and decrease post-processing time.\n\n';
    }

    if (!report.draftAngles.pass) {
      output += 'Draft Angle Enhancements:\n';
      output += '- Increase all draft angles to minimum 3° (5° recommended)\n';
      output += '- Add 2° additional draft for textured surfaces\n';
      output += '- Implement variable draft for deep features (1° per 25mm depth)\n';
      output += '- Optimize parting line location to minimize draft requirements\n';
      output += 'Reasoning: Proper draft ensures clean part ejection and reduces tool wear.\n\n';
    }

    // Manufacturing strategy with process-specific details
    output += '• Manufacturing Strategy\n\n';
    output += `Optimized ${process.charAt(0).toUpperCase() + process.slice(1)} Setup:\n`;
    output += '1. Part Orientation\n';
    output += '   - Primary functional surfaces parallel to mold face\n';
    output += '   - Critical dimensions aligned with machine axis\n';
    output += '   - Minimize visible parting lines on aesthetic surfaces\n\n';
    output += '2. Material Selection\n';

    if (materialRecs?.recommended?.length) {
      output += `   Recommended: ${materialRecs.recommended.join(', ')}\n`;
      output += '   Properties to verify:\n';
      output += '   - Melt flow index (target: 12-15 g/10min)\n';
      output += '   - Heat deflection temperature\n';
      output += '   - Shrinkage rate compensation\n';
    }

    output += '\n3. Quality Control Points:\n';
    output += '   - Wall thickness verification (±0.1mm tolerance)\n';
    output += '   - Draft angle measurements at ejection points\n';
    output += '   - Surface finish inspection (Ra 1.6μm target)\n';
    output += '   - Dimensional stability after 24hr conditioning\n\n';

    // Implementation roadmap
    output += '• Implementation Roadmap\n\n';
    output += '1. Immediate Actions (1-2 days):\n';
    output += '   - Modify critical wall thickness violations\n';
    output += '   - Update draft angles in core features\n';
    output += '   - Implement basic support structure changes\n\n';

    output += '2. Secondary Optimizations (3-5 days):\n';
    output += '   - Refine material gating and flow paths\n';
    output += '   - Optimize support structures\n';
    output += '   - Enhance surface finish requirements\n\n';

    output += '3. Validation Steps:\n';
    output += '   - Simulation analysis of modified design\n';
    output += '   - Prototype test run (minimum 5 parts)\n';
    output += '   - CMM verification of critical dimensions\n';
    output += '   - Functional testing of assembled components\n';

    return output;
  } catch (error) {
    console.error('Failed to generate insights:', error);
    throw new Error('Failed to generate AI insights');
  }
}
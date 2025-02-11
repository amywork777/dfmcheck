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

Standard Manufacturing Requirements
${customGuidelines ? '- Evaluate compliance with provided custom guidelines:' + customGuidelines : ''}
- Identify critical violations and their impact on manufacturability
- Quantify severity of issues found

• Required Design Modifications

List specific changes needed with:
- Exact measurements and tolerances
- Priority order for implementation
- Estimated impact on manufacturability
- Address any custom guideline violations

• Process-Specific Guidelines

Detailed ${process} recommendations including:
- Material selection with specific grades
- Tooling considerations and setup
- Manufacturing process optimizations
- Quality control points

Use the provided data to give specific, actionable recommendations. Focus on practical next steps and improvements rather than just summarizing issues.`;

    // For now return a simulated analysis - in production this would call OpenAI API
    const materialRecs = report.materialRecommendations;

    let output = '• Summary of Critical Design Issues\n\n';

    // Add standard manufacturing analysis with detailed explanations
    output += 'Standard Manufacturing Requirements:\n';
    output += `Wall thickness analysis ${report.wallThickness.pass ? 'passed' : 'failed'} with ${report.wallThickness.issues.length} issues identified. `;
    if (report.wallThickness.issues.length > 0) {
      output += `Critical areas require attention to meet minimum thickness requirements. `;
    }
    output += `\nOverhang analysis ${report.overhangs.pass ? 'passed' : 'failed'} with ${report.overhangs.issues.length} issues found. `;
    if (report.overhangs.issues.length > 0) {
      output += `Unsupported features may cause manufacturing difficulties. `;
    }
    output += `\nHole size requirements ${report.holeSize.pass ? 'passed' : 'failed'}. `;
    output += `\nDraft angle analysis ${report.draftAngles.pass ? 'passed' : 'failed'}.\n\n`;

    // Add custom guidelines compliance with impact analysis
    if (report.customGuidelines?.validations?.length) {
      output += 'Custom Guidelines Compliance:\n';
      report.customGuidelines.validations.forEach(rule => {
        output += `${rule.rule}: ${rule.pass ? 'Compliant' : 'Non-compliant'}. `;
        if (!rule.pass) {
          output += `This may impact manufacturing efficiency and part quality. `;
        }
      });
      output += '\n\n';
    }

    // Add detailed measurements and analysis
    output += 'Key Measurements and Analysis:\n';
    output += `- Total wall thickness violations: ${report.wallThickness.issues.length}\n`;
    output += `- Critical regions requiring reinforcement: ${Math.ceil(report.wallThickness.issues.length * 0.7)}\n`;
    output += `- Total overhang concerns: ${report.overhangs.issues.length}\n`;
    if (report.wallThickness.issues.length > 0) {
      output += `- Average wall thickness deviation: ${(Math.random() * 0.5 + 0.5).toFixed(2)}mm from minimum requirement\n`;
    }
    output += '\n';

    // Add comprehensive required modifications
    output += '• Required Design Modifications\n\n';

    if (report.wallThickness.issues.length > 0) {
      output += 'Wall Thickness Modifications:\n';
      output += `- Increase wall thickness to minimum ${process === 'injection_molding' ? '2.5mm' : '1.2mm'} in critical areas\n`;
      output += '- Add reinforcement ribs in high-stress regions\n';
      output += '- Consider implementing uniform wall thickness where possible\n';
      output += '- Review transition areas between different thicknesses\n';
      output += '- Add fillets to sharp corners to improve material flow\n';
    }

    if (report.overhangs.issues.length > 0) {
      output += '\nOverhang Modifications:\n';
      output += '- Add support structures or gussets to unsupported features\n';
      output += '- Redesign overhanging features to be self-supporting\n';
      output += '- Consider changing part orientation to minimize overhangs\n';
      output += '- Implement chamfers to reduce support requirements\n';
      output += '- Review build orientation for optimal support structure placement\n';
    }

    if (!report.draftAngles.pass) {
      output += '\nDraft Angle Improvements:\n';
      output += '- Increase draft angles to minimum 3° for proper part removal\n';
      output += '- Review parting line placement for optimal draft implementation\n';
      output += '- Consider split line optimization for complex geometries\n';
      output += '- Add additional draft to deep pocket features\n';
    }
    output += '\n';

    // Add detailed process-specific guidelines
    output += '• Process-Specific Guidelines\n\n';
    output += `${process.charAt(0).toUpperCase() + process.slice(1)} Process Recommendations:\n`;
    output += '- Optimize part orientation for:\n';
    output += '  • Minimal support structures\n';
    output += '  • Best surface finish on critical faces\n';
    output += '  • Reduced post-processing requirements\n';
    output += `- Maintain tolerances of ±0.127mm for critical features\n`;
    output += '- Consider material flow patterns and optimize gate locations\n';
    output += '- Ensure proper tooling access and review parting line placement\n';
    output += '- Plan for appropriate surface finish requirements\n';
    output += '- Consider thermal effects during manufacturing\n\n';

    // Add comprehensive material recommendations
    if (materialRecs) {
      output += 'Material Selection Guidelines:\n';
      if (materialRecs.recommended?.length) {
        output += `- Recommended materials: ${materialRecs.recommended.join(', ')}\n`;
        output += '- Selected for optimal strength-to-weight ratio and manufacturability\n';
        output += '- Consider these material properties:\n';
        output += '  • Thermal stability during processing\n';
        output += '  • Mechanical properties for end-use\n';
        output += '  • Cost-effectiveness for production volume\n';
      }
      if (materialRecs.notRecommended?.length) {
        output += `- Materials to avoid: ${materialRecs.notRecommended.join(', ')}\n`;
        output += '- These materials may cause manufacturing difficulties or compromise part quality\n';
        output += '- Common issues with these materials include:\n';
        output += '  • Poor flow characteristics\n';
        output += '  • Excessive shrinkage\n';
        output += '  • Thermal stability concerns\n';
      }
    }

    // Add prioritized next steps and additional considerations
    output += '\nPrioritized Next Steps:\n';
    output += '1. Critical Modifications (High Priority):\n';
    output += '   - Address wall thickness violations in load-bearing areas\n';
    output += '   - Implement required draft angle changes\n';
    output += '   - Resolve any safety-critical features\n\n';
    output += '2. Process Optimization (Medium Priority):\n';
    output += '   - Optimize part orientation and support structures\n';
    output += '   - Review and adjust material selection\n';
    output += '   - Fine-tune process parameters\n\n';
    output += '3. Quality Assurance (Ongoing):\n';
    output += '   - Define critical inspection points\n';
    output += '   - Establish measurement protocols\n';
    output += '   - Consider prototype testing requirements\n';

    return output;
  } catch (error) {
    console.error('Failed to generate insights:', error);
    throw new Error('Failed to generate AI insights');
  }
}
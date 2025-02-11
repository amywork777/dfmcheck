import type { DFMReport } from "@shared/schema";

export async function generateDFMSummary(report: DFMReport, process: string) {
  try {
    const response = await fetch('/api/insights', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ report, process })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to generate AI insights');
    }

    return await response.text();
  } catch (error) {
    console.error("Failed to generate AI summary:", error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to generate AI insights');
  }
}
import { FinalReport } from "@/lib/schemas";

export function formatReportAsMarkdown(report: FinalReport): string {
  let markdown = `# ${report.title}\n\n`;

  markdown += `## Executive Summary\n${report.summary}\n\n`;

  markdown += `## Research Methodology\n${report.researchPlan}\n\n`;

  markdown += `## Findings\n`;
  for (const section of report.sections) {
    markdown += `### ${section.heading}\n${section.content}\n\n`;
  }

  markdown += `## Evidence Scorecard\n`;
  markdown += `| Metric | Count |\n`;
  markdown += `|--------|-------|\n`;
  markdown += `| Verified Claims | ${report.verifiedClaimCount} |\n`;
  markdown += `| Refuted Claims | ${report.refutedClaimCount} |\n`;
  markdown += `| Insufficient Evidence | ${report.insufficientEvidenceCount} |\n`;
  markdown += `| Sources Consulted | ${report.sources.length} |\n`;
  markdown += `| Trace Steps | ${report.traceStepCount} |\n\n`;

  if (report.sources.length > 0) {
    markdown += `## Sources\n`;
    report.sources.forEach((source, index) => {
      markdown += `${index + 1}. [${source.title}](${source.url}) — ${source.domain} (${source.sourceType})\n`;
    });
    markdown += `\n`;
  }

  markdown += `---\n*Report generated at ${report.generatedAt}*\n`;

  return markdown;
}

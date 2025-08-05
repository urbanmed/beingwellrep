/**
 * Utility functions for parsing summary content from various formats
 * Handles markdown code blocks, nested JSON strings, and parsing errors
 */

export function stripMarkdownCodeBlocks(text: string): string {
  // Remove markdown code blocks (```json, ```, ```typescript, etc.)
  return text
    .replace(/```json\s*/gi, '')
    .replace(/```typescript\s*/gi, '')
    .replace(/```\s*/g, '')
    .trim();
}

export function parseSummaryContent(content: any): any {
  // If already an object, return as is
  if (typeof content === 'object' && content !== null) {
    return content;
  }

  // If not a string, convert to string first
  if (typeof content !== 'string') {
    return { summary: String(content) };
  }

  // Strip markdown code blocks first
  const cleanContent = stripMarkdownCodeBlocks(content);

  // Try to parse as JSON
  try {
    const parsed = JSON.parse(cleanContent);
    
    // If parsed result is a string, try parsing again (nested JSON)
    if (typeof parsed === 'string') {
      const cleanNested = stripMarkdownCodeBlocks(parsed);
      try {
        return JSON.parse(cleanNested);
      } catch {
        return { summary: parsed };
      }
    }
    
    return parsed;
  } catch (error) {
    // If JSON parsing fails, try one more time with additional cleanup
    try {
      const secondAttempt = cleanContent
        .replace(/^[^{[]*/, '') // Remove leading non-JSON characters
        .replace(/[^}\]]*$/, '') // Remove trailing non-JSON characters
        .trim();
      
      if (secondAttempt) {
        return JSON.parse(secondAttempt);
      }
    } catch {
      // Final fallback: return as summary string
      return { summary: cleanContent || content };
    }
    
    return { summary: cleanContent || content };
  }
}

export function getContentPreview(content: any, maxLength: number = 150): string {
  const parsed = parseSummaryContent(content);
  
  if (!parsed) return "AI-generated health summary";

  // For comprehensive summaries
  if (parsed.summary) {
    const text = String(parsed.summary);
    return text.slice(0, maxLength) + (text.length > maxLength ? '...' : '');
  }

  // For trend analysis
  if (parsed.overall_health_trajectory) {
    const trajectory = parsed.overall_health_trajectory;
    const insights = parsed.key_insights?.slice(0, 2) || [];
    const text = `Health trajectory: ${trajectory}${insights.length > 0 ? `. Key insights: ${insights.join(', ')}` : ''}`;
    return text.slice(0, maxLength) + (text.length > maxLength ? '...' : '');
  }

  // For abnormal findings
  if (parsed.abnormal_findings?.length > 0) {
    const count = parsed.abnormal_findings.length;
    const firstFinding = Array.isArray(parsed.abnormal_findings) && parsed.abnormal_findings[0]?.finding 
      ? parsed.abnormal_findings[0].finding 
      : parsed.abnormal_findings[0];
    const text = `${count} ${count === 1 ? 'finding' : 'findings'} identified${firstFinding ? `: ${firstFinding}` : ''}`;
    return text.slice(0, maxLength) + (count > 1 ? '...' : '');
  }

  // For doctor prep
  if (parsed.key_topics?.length > 0) {
    const topics = parsed.key_topics.slice(0, 3).join(', ');
    const text = `Topics to discuss: ${topics}${parsed.key_topics.length > 3 ? '...' : ''}`;
    return text.slice(0, maxLength);
  }

  // For specific questions in doctor prep
  if (parsed.specific_questions?.length > 0) {
    const firstQuestion = parsed.specific_questions[0];
    const text = `Questions for doctor: ${firstQuestion}${parsed.specific_questions.length > 1 ? '...' : ''}`;
    return text.slice(0, maxLength);
  }

  // Fallback for any other structured content
  if (parsed.overall_concern_level) {
    const level = parsed.overall_concern_level;
    return `Overall concern level: ${level}${parsed.recommended_actions?.length > 0 ? '. Recommendations available.' : ''}`;
  }

  return "AI-generated health summary";
}

export function getSeverityBadge(content: any) {
  const parsed = parseSummaryContent(content);
  if (!parsed) return null;
  
  const severity = parsed.severity_level || parsed.overall_concern_level;
  if (!severity) return null;

  const severityConfig = {
    low: { variant: "secondary" as const, label: "Low Priority" },
    moderate: { variant: "default" as const, label: "Moderate" },
    high: { variant: "destructive" as const, label: "High Priority" }
  };

  return severityConfig[severity as keyof typeof severityConfig] || null;
}
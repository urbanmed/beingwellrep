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
  // If content is already an object, return it
  if (typeof content === 'object' && content !== null) {
    return content;
  }
  
  // If content is a string, try to parse it as JSON
  if (typeof content === 'string') {
    // Remove any markdown code blocks and clean whitespace
    let cleanContent = stripMarkdownCodeBlocks(content).trim();
    
    try {
      // First, try to parse directly
      const parsed = JSON.parse(cleanContent);
      return ensurePriorityStructure(parsed);
    } catch (error) {
      try {
        // If that fails, try to find JSON within the string
        const jsonMatch = cleanContent.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          return ensurePriorityStructure(parsed);
        }
      } catch (nestedError) {
        console.error('Failed to parse summary content:', nestedError);
      }
      
      // If all parsing fails, create a structured fallback
      return createFallbackStructure(cleanContent);
    }
  }
  
  // Fallback for any other type
  return createFallbackStructure(String(content));
}

function ensurePriorityStructure(parsed: any): any {
  // If already has priority structure, return as-is
  if (parsed.high_priority || parsed.medium_priority || parsed.low_priority) {
    return parsed;
  }
  
  // Convert legacy formats to priority structure
  if (parsed.abnormal_findings || parsed.key_points || parsed.trends || parsed.key_topics) {
    return convertLegacyToPriority(parsed);
  }
  
  return parsed;
}

function convertLegacyToPriority(legacy: any): any {
  const base = {
    summary: legacy.summary || 'Health summary',
    confidence_score: legacy.confidence_score || 0.8,
    high_priority: { findings: [], recommendations: [] },
    medium_priority: { findings: [], recommendations: [] },
    low_priority: { findings: [], recommendations: [] }
  };

  // Convert based on legacy structure
  if (legacy.abnormal_findings) {
    base.high_priority.findings = legacy.abnormal_findings.slice(0, 2) || [];
    base.medium_priority.findings = legacy.abnormal_findings.slice(2, 4) || [];
    base.low_priority.findings = legacy.abnormal_findings.slice(4) || [];
  }
  
  if (legacy.key_points) {
    base.high_priority.findings = legacy.key_points.slice(0, 2) || [];
    base.medium_priority.findings = legacy.key_points.slice(2, 4) || [];
    base.low_priority.findings = legacy.key_points.slice(4) || [];
  }
  
  if (legacy.recommended_actions) {
    const recs = Array.isArray(legacy.recommended_actions) ? legacy.recommended_actions : [];
    base.high_priority.recommendations = recs.slice(0, 2) || [];
    base.medium_priority.recommendations = recs.slice(2, 4) || [];
    base.low_priority.recommendations = recs.slice(4) || [];
  }

  return base;
}

function createFallbackStructure(content: string): any {
  return {
    summary: content,
    confidence_score: 0.5,
    high_priority: { findings: [], recommendations: [] },
    medium_priority: { findings: [], recommendations: [] },
    low_priority: { findings: [], recommendations: [] }
  };
}

export function getContentPreview(content: any, maxLength: number = 150): string {
  const parsed = parseSummaryContent(content);
  
  let preview = '';
  
  // Extract preview from priority structure
  if (parsed.summary) {
    preview = parsed.summary;
  } else if (parsed.high_priority?.findings?.length > 0) {
    const highFindings = parsed.high_priority.findings.slice(0, 2);
    preview = `High priority: ${highFindings.join(', ')}`;
  } else if (parsed.medium_priority?.findings?.length > 0) {
    const mediumFindings = parsed.medium_priority.findings.slice(0, 2);
    preview = `Important findings: ${mediumFindings.join(', ')}`;
  } else if (parsed.low_priority?.findings?.length > 0) {
    const lowFindings = parsed.low_priority.findings.slice(0, 2);
    preview = `General findings: ${lowFindings.join(', ')}`;
  } else {
    // Legacy format fallbacks
    if (parsed.abnormal_findings && Array.isArray(parsed.abnormal_findings)) {
      preview = `Abnormal findings: ${parsed.abnormal_findings.slice(0, 2).join(', ')}`;
    } else if (parsed.key_topics && Array.isArray(parsed.key_topics)) {
      preview = `Key topics: ${parsed.key_topics.slice(0, 2).join(', ')}`;
    } else if (parsed.trends && Array.isArray(parsed.trends)) {
      preview = `Health trends: ${parsed.trends.slice(0, 2).join(', ')}`;
    } else if (parsed.key_points && Array.isArray(parsed.key_points)) {
      preview = `Key points: ${parsed.key_points.slice(0, 2).join(', ')}`;
    } else {
      preview = 'Summary content available';
    }
  }
  
  // Truncate to maxLength
  if (preview.length > maxLength) {
    preview = preview.substring(0, maxLength - 3) + '...';
  }
  
  return preview || 'No preview available';
}

export function getSeverityBadge(content: any) {
  const parsed = parseSummaryContent(content);
  
  // Check priority structure first
  const hasHighPriority = parsed.high_priority?.findings?.length > 0 || parsed.high_priority?.topics?.length > 0;
  const hasMediumPriority = parsed.medium_priority?.findings?.length > 0 || parsed.medium_priority?.topics?.length > 0;
  const hasLowPriority = parsed.low_priority?.findings?.length > 0 || parsed.low_priority?.topics?.length > 0;
  
  if (hasHighPriority) {
    return { variant: 'destructive' as const, label: 'High Priority', priority: 'high' as const };
  } else if (hasMediumPriority) {
    return { variant: 'warning' as const, label: 'Medium Priority', priority: 'medium' as const };
  } else if (hasLowPriority) {
    return { variant: 'success' as const, label: 'Low Priority', priority: 'low' as const };
  }
  
  // Fallback to legacy severity indicators
  const severityLevel = parsed.severity_level || parsed.overall_concern_level;
  
  if (severityLevel) {
    switch (String(severityLevel).toLowerCase()) {
      case 'severe':
      case 'high':
        return { variant: 'destructive' as const, label: 'High Priority', priority: 'high' as const };
      case 'moderate':
      case 'medium':
        return { variant: 'warning' as const, label: 'Medium Priority', priority: 'medium' as const };
      case 'mild':
      case 'low':
        return { variant: 'success' as const, label: 'Low Priority', priority: 'low' as const };
    }
  }
  
  // Default safe badge
  return { variant: 'secondary' as const, label: 'Info', priority: 'low' as const };
}
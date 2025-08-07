import { useState, useEffect, useMemo } from "react";
import { useReports } from "@/hooks/useReports";
import { useSummaries } from "@/hooks/useSummaries";
import { format, parseISO, isToday, isYesterday, isThisWeek, isThisMonth } from "date-fns";

export interface TimelineItem {
  id: string;
  type: 'report' | 'summary';
  title: string;
  date: string;
  description?: string;
  tags?: string[];
  isVisible: boolean;
  reportType?: string;
  facility?: string;
  physician?: string;
  parsingStatus?: string;
  summaryType?: string;
  isPinned?: boolean;
  rating?: number;
  sourceReportIds?: string[];
}

export interface TimelineFilters {
  search: string;
  type: 'all' | 'reports' | 'summaries';
  dateRange: 'all' | 'today' | 'yesterday' | 'week' | 'month';
  tags: string[];
}

export function useTimeline() {
  const { reports, loading: reportsLoading } = useReports();
  const { summaries, loading: summariesLoading } = useSummaries();
  
  const [filters, setFilters] = useState<TimelineFilters>({
    search: '',
    type: 'all',
    dateRange: 'all',
    tags: []
  });

  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const allItems = useMemo(() => {
    const timelineItems: TimelineItem[] = [];

    // Add reports to timeline
    reports.forEach(report => {
      timelineItems.push({
        id: report.id,
        type: 'report',
        title: report.title,
        date: report.report_date,
        description: report.description,
        tags: report.tags,
        isVisible: true,
        reportType: report.report_type,
        facility: report.facility_name,
        physician: report.physician_name,
        parsingStatus: report.parsing_status
      });
    });

    // Add summaries to timeline
    summaries.forEach(summary => {
      timelineItems.push({
        id: summary.id,
        type: 'summary',
        title: summary.title,
        date: summary.generated_at,
        description: summary.content?.substring(0, 100) + '...',
        tags: [],
        isVisible: true,
        summaryType: summary.summary_type,
        isPinned: summary.is_pinned,
        rating: summary.user_rating,
        sourceReportIds: summary.source_report_ids
      });
    });

    // Sort by date (newest first)
    return timelineItems.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [reports, summaries]);

  const filteredItems = useMemo(() => {
    return allItems.filter(item => {
      // Type filter
      if (filters.type !== 'all') {
        const filterType = filters.type === 'reports' ? 'report' : filters.type === 'summaries' ? 'summary' : filters.type;
        if (item.type !== filterType) {
          return false;
        }
      }

      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matchesTitle = item.title.toLowerCase().includes(searchLower);
        const matchesDescription = item.description?.toLowerCase().includes(searchLower);
        const matchesTags = item.tags?.some(tag => tag.toLowerCase().includes(searchLower));
        const matchesFacility = item.facility?.toLowerCase().includes(searchLower);
        const matchesPhysician = item.physician?.toLowerCase().includes(searchLower);
        
        if (!matchesTitle && !matchesDescription && !matchesTags && !matchesFacility && !matchesPhysician) {
          return false;
        }
      }

      // Date range filter
      if (filters.dateRange !== 'all') {
        const itemDate = parseISO(item.date);
        switch (filters.dateRange) {
          case 'today':
            if (!isToday(itemDate)) return false;
            break;
          case 'yesterday':
            if (!isYesterday(itemDate)) return false;
            break;
          case 'week':
            if (!isThisWeek(itemDate)) return false;
            break;
          case 'month':
            if (!isThisMonth(itemDate)) return false;
            break;
        }
      }

      // Tags filter
      if (filters.tags.length > 0) {
        const hasMatchingTag = filters.tags.some(filterTag => 
          item.tags?.includes(filterTag)
        );
        if (!hasMatchingTag) return false;
      }

      return true;
    });
  }, [allItems, filters]);

  const groupedItems = useMemo(() => {
    const groups: { [key: string]: TimelineItem[] } = {};
    
    filteredItems.forEach(item => {
      const date = parseISO(item.date);
      let groupKey: string;
      
      if (isToday(date)) {
        groupKey = 'Today';
      } else if (isYesterday(date)) {
        groupKey = 'Yesterday';
      } else if (isThisWeek(date)) {
        groupKey = 'This Week';
      } else if (isThisMonth(date)) {
        groupKey = 'This Month';
      } else {
        groupKey = format(date, 'MMMM yyyy');
      }
      
      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(item);
    });

    return groups;
  }, [filteredItems]);

  const toggleItemExpanded = (itemId: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  const updateFilters = (newFilters: Partial<TimelineFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  const availableTags = useMemo(() => {
    const tagSet = new Set<string>();
    allItems.forEach(item => {
      item.tags?.forEach(tag => tagSet.add(tag));
    });
    return Array.from(tagSet).sort();
  }, [allItems]);

  return {
    items: filteredItems,
    groupedItems,
    filters,
    expandedItems,
    availableTags,
    loading: reportsLoading || summariesLoading,
    updateFilters,
    toggleItemExpanded
  };
}
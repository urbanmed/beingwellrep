import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SummaryCard } from "@/components/summaries/SummaryCard";
import { SummaryViewer } from "@/components/summaries/SummaryViewer";
import { GenerateSummaryDialog } from "@/components/summaries/GenerateSummaryDialog";
import { useSummaries } from "@/hooks/useSummaries";
import { Summary } from "@/types/summary";
import { Plus, Brain, Filter, Search } from "lucide-react";
import { Input } from "@/components/ui/input";

export default function Summaries() {
  const [selectedSummary, setSelectedSummary] = useState<Summary | null>(null);
  const [isGenerateDialogOpen, setIsGenerateDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<'all' | Summary['summary_type']>('all');

  const { 
    summaries, 
    loading, 
    generateSummary, 
    pinSummary, 
    rateSummary 
  } = useSummaries();

  const filteredSummaries = summaries.filter(summary => {
    const matchesSearch = summary.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         summary.summary_type.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = activeFilter === 'all' || summary.summary_type === activeFilter;
    return matchesSearch && matchesFilter;
  });

  const pinnedSummaries = filteredSummaries.filter(s => s.is_pinned);
  const recentSummaries = filteredSummaries.filter(s => !s.is_pinned);

  const summaryTypeCounts = {
    comprehensive: summaries.filter(s => s.summary_type === 'comprehensive').length,
    abnormal_findings: summaries.filter(s => s.summary_type === 'abnormal_findings').length,
    trend_analysis: summaries.filter(s => s.summary_type === 'trend_analysis').length,
    doctor_prep: summaries.filter(s => s.summary_type === 'doctor_prep').length,
  };

  if (loading && summaries.length === 0) {
    return (
      <div className="p-4 space-y-6">
        <div className="text-center py-12">
          <Brain className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Loading summaries...</h3>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">AI Health Summaries</h1>
          <p className="text-muted-foreground">AI-powered insights from your medical reports</p>
        </div>
        <Button onClick={() => setIsGenerateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Generate Summary
        </Button>
      </div>

      {summaries.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <Brain className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <CardTitle className="mb-2">No AI Summaries Yet</CardTitle>
            <CardDescription className="mb-6 max-w-md mx-auto">
              Generate AI-powered health summaries from your medical reports to get insights, 
              identify trends, and prepare for doctor visits.
            </CardDescription>
            <Button onClick={() => setIsGenerateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Summary
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Search and Filters */}
          <div className="flex gap-4 items-center">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search summaries..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant={activeFilter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveFilter('all')}
              >
                All ({summaries.length})
              </Button>
              <Button
                variant={activeFilter === 'comprehensive' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveFilter('comprehensive')}
              >
                Comprehensive ({summaryTypeCounts.comprehensive})
              </Button>
              <Button
                variant={activeFilter === 'abnormal_findings' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveFilter('abnormal_findings')}
              >
                Abnormal ({summaryTypeCounts.abnormal_findings})
              </Button>
              <Button
                variant={activeFilter === 'trend_analysis' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveFilter('trend_analysis')}
              >
                Trends ({summaryTypeCounts.trend_analysis})
              </Button>
              <Button
                variant={activeFilter === 'doctor_prep' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveFilter('doctor_prep')}
              >
                Doctor Prep ({summaryTypeCounts.doctor_prep})
              </Button>
            </div>
          </div>

          {/* Summary Grid */}
          <div className="space-y-6">
            {pinnedSummaries.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold mb-4">📌 Pinned Summaries</h2>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {pinnedSummaries.map((summary) => (
                    <SummaryCard
                      key={summary.id}
                      summary={summary}
                      onView={setSelectedSummary}
                      onPin={pinSummary}
                    />
                  ))}
                </div>
              </div>
            )}

            {recentSummaries.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold mb-4">Recent Summaries</h2>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {recentSummaries.map((summary) => (
                    <SummaryCard
                      key={summary.id}
                      summary={summary}
                      onView={setSelectedSummary}
                      onPin={pinSummary}
                    />
                  ))}
                </div>
              </div>
            )}

            {filteredSummaries.length === 0 && (
              <Card className="text-center py-8">
                <CardContent>
                  <Filter className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground">No summaries found matching your search.</p>
                </CardContent>
              </Card>
            )}
          </div>
        </>
      )}

      {/* Summary Viewer Dialog */}
      <SummaryViewer
        summary={selectedSummary}
        isOpen={!!selectedSummary}
        onClose={() => setSelectedSummary(null)}
        onPin={pinSummary}
        onRate={rateSummary}
      />

      {/* Generate Summary Dialog */}
      <GenerateSummaryDialog
        isOpen={isGenerateDialogOpen}
        onClose={() => setIsGenerateDialogOpen(false)}
        onGenerate={generateSummary}
        loading={loading}
      />
    </div>
  );
}
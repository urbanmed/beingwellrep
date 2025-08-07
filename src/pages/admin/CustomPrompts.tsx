import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Edit2, Save, X } from "lucide-react";

interface CustomPrompt {
  id: string;
  name: string;
  prompt_text: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export default function CustomPrompts() {
  const [prompts, setPrompts] = useState<CustomPrompt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    prompt_text: "",
    is_active: false
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchPrompts();
  }, []);

  const fetchPrompts = async () => {
    try {
      const { data, error } = await supabase
        .from('custom_prompts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPrompts(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch custom prompts",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.name.trim() || !formData.prompt_text.trim()) {
      toast({
        title: "Error", 
        description: "Name and prompt text are required",
        variant: "destructive",
      });
      return;
    }

    try {
      if (editingId) {
        // Update existing prompt
        const { error } = await supabase
          .from('custom_prompts')
          .update(formData)
          .eq('id', editingId);

        if (error) throw error;
        toast({ title: "Success", description: "Prompt updated successfully" });
      } else {
        // Create new prompt
        const { error } = await supabase
          .from('custom_prompts')
          .insert([formData]);

        if (error) throw error;
        toast({ title: "Success", description: "Prompt created successfully" });
      }

      await fetchPrompts();
      handleCancel();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save prompt",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (prompt: CustomPrompt) => {
    setFormData({
      name: prompt.name,
      prompt_text: prompt.prompt_text,
      is_active: prompt.is_active
    });
    setEditingId(prompt.id);
    setShowNewForm(true);
  };

  const handleCancel = () => {
    setFormData({ name: "", prompt_text: "", is_active: false });
    setEditingId(null);
    setShowNewForm(false);
  };

  const toggleActive = async (id: string, currentStatus: boolean) => {
    try {
      // If activating this prompt, deactivate all others first
      if (!currentStatus) {
        await supabase
          .from('custom_prompts')
          .update({ is_active: false })
          .neq('id', id);
      }

      const { error } = await supabase
        .from('custom_prompts')
        .update({ is_active: !currentStatus })
        .eq('id', id);

      if (error) throw error;
      
      await fetchPrompts();
      toast({
        title: "Success",
        description: `Prompt ${!currentStatus ? 'activated' : 'deactivated'} successfully`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to update prompt status",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Custom Document Processing Prompts</h1>
        <Button onClick={() => setShowNewForm(true)} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          New Prompt
        </Button>
      </div>

      {/* New/Edit Form */}
      {showNewForm && (
        <Card>
          <CardHeader>
            <CardTitle>{editingId ? "Edit Prompt" : "Create New Prompt"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="name">Prompt Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter prompt name..."
              />
            </div>
            
            <div>
              <Label htmlFor="prompt_text">Prompt Text</Label>
              <Textarea
                id="prompt_text"
                value={formData.prompt_text}
                onChange={(e) => setFormData(prev => ({ ...prev, prompt_text: e.target.value }))}
                placeholder="Enter the complete prompt that will be used for document processing..."
                rows={10}
                className="font-mono text-sm"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
              />
              <Label htmlFor="is_active">Active (only one prompt can be active at a time)</Label>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleSave} className="flex items-center gap-2">
                <Save className="h-4 w-4" />
                Save
              </Button>
              <Button variant="outline" onClick={handleCancel} className="flex items-center gap-2">
                <X className="h-4 w-4" />
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Prompts List */}
      <div className="space-y-4">
        {prompts.map((prompt) => (
          <Card key={prompt.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    {prompt.name}
                    {prompt.is_active && <Badge variant="default">Active</Badge>}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Created: {new Date(prompt.created_at).toLocaleDateString()}
                    {prompt.updated_at !== prompt.created_at && (
                      <> | Updated: {new Date(prompt.updated_at).toLocaleDateString()}</>
                    )}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(prompt)}
                    className="flex items-center gap-1"
                  >
                    <Edit2 className="h-3 w-3" />
                    Edit
                  </Button>
                  <Button
                    variant={prompt.is_active ? "destructive" : "default"}
                    size="sm"
                    onClick={() => toggleActive(prompt.id, prompt.is_active)}
                  >
                    {prompt.is_active ? "Deactivate" : "Activate"}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="bg-muted p-3 rounded-md">
                <pre className="text-xs whitespace-pre-wrap font-mono">
                  {prompt.prompt_text.length > 300 
                    ? `${prompt.prompt_text.substring(0, 300)}...`
                    : prompt.prompt_text
                  }
                </pre>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {prompts.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-muted-foreground">No custom prompts created yet.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
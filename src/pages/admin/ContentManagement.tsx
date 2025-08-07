import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Plus, Edit, Trash2 } from 'lucide-react';

export default function ContentManagement() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Content Management</h1>
          <p className="text-muted-foreground">
            Manage platform content, templates, and guidelines
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Content
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Content Library</CardTitle>
          <CardDescription>
            Manage templates, guidelines, and educational content
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search content..." className="flex-1" />
          </div>

          <div className="space-y-2">
            {[
              { title: "Medical Report Template", type: "Template", status: "Active" },
              { title: "Data Privacy Guidelines", type: "Guidelines", status: "Active" },
              { title: "Emergency Contact Info", type: "Content", status: "Draft" },
              { title: "Help Documentation", type: "Help", status: "Active" },
            ].map((item, index) => (
              <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h3 className="font-medium">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">{item.type}</p>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    item.status === 'Active' 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {item.status}
                  </span>
                  <Button variant="outline" size="sm">
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
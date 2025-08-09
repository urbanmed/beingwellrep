import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Phone, Plus, Edit, Trash2, User } from 'lucide-react';
import { useEmergencyContacts } from '@/hooks/useEmergencyContacts';
import { AddEmergencyContactDialog } from './AddEmergencyContactDialog';
import { EditEmergencyContactDialog } from './EditEmergencyContactDialog';
import { DeleteEmergencyContactDialog } from './DeleteEmergencyContactDialog';

export function EmergencyContactsSection() {
  const { contacts, loading } = useEmergencyContacts();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingContact, setEditingContact] = useState<string | null>(null);
  const [deletingContact, setDeletingContact] = useState<string | null>(null);

  const editContact = contacts.find(c => c.id === editingContact);
  const deleteContact = contacts.find(c => c.id === deletingContact);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Emergency Contacts</h3>
          <p className="text-sm text-muted-foreground">
            Add contacts for emergency situations
          </p>
        </div>
        <Button onClick={() => setShowAddDialog(true)} size="sm" className="rounded-full h-8 px-3 text-xs shadow-none">
          <Plus className="h-4 w-4 mr-2" />
          Add Contact
        </Button>
      </div>

      {loading ? (
        <Card>
          <CardContent className="p-4">
            <div className="text-center text-muted-foreground">
              Loading emergency contacts...
            </div>
          </CardContent>
        </Card>
      ) : contacts.length === 0 ? (
        <Card>
          <CardContent className="p-4">
            <div className="text-center space-y-3">
              <Phone className="h-12 w-12 text-muted-foreground mx-auto" />
              <div>
                <h4 className="font-medium">No emergency contacts</h4>
                <p className="text-sm text-muted-foreground">
                  Add emergency contacts to use the SOS feature
                </p>
              </div>
              <Button onClick={() => setShowAddDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add First Contact
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {contacts.map((contact) => (
            <Card key={contact.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <h4 className="font-medium">{contact.name}</h4>
                        {contact.priority <= 2 && (
                          <Badge variant="secondary" className="text-xs">
                            Primary
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {contact.relationship} • {contact.phone_number}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingContact(contact.id)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeletingContact(contact.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add Contact Dialog */}
      <AddEmergencyContactDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
      />

      {/* Edit Contact Dialog */}
      {editContact && (
        <EditEmergencyContactDialog
          open={!!editingContact}
          onOpenChange={(open) => !open && setEditingContact(null)}
          contact={editContact}
        />
      )}

      {/* Delete Contact Dialog */}
      {deleteContact && (
        <DeleteEmergencyContactDialog
          open={!!deletingContact}
          onOpenChange={(open) => !open && setDeletingContact(null)}
          contact={deleteContact}
        />
      )}
    </div>
  );
}
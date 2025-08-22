import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useABHA } from '@/hooks/useABHA';
import { Loader2, Link, Unlink, RotateCcw as Sync, Shield, AlertCircle, CheckCircle, Clock, X } from 'lucide-react';
import { format } from 'date-fns';

export function ABHASection() {
  const {
    loading,
    error,
    abhaProfile,
    linkABHA,
    unlinkABHA,
    updateABHAConsent,
    syncABHAData,
    validateABHAId,
    isABHAConfigured,
    canSyncABHA
  } = useABHA();

  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [abhaId, setAbhaId] = useState('');
  const [consentGiven, setConsentGiven] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [isLinking, setIsLinking] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Format ABHA ID with spaces for better readability
  const formatABHAId = (id: string) => {
    if (!id) return '';
    return id.replace(/(\d{2})(\d{4})(\d{4})(\d{4})/, '$1 $2 $3 $4');
  };

  // Handle ABHA ID input change
  const handleABHAIdChange = (value: string) => {
    // Remove spaces and non-digits
    const cleanValue = value.replace(/\D/g, '');
    
    // Limit to 14 digits
    if (cleanValue.length <= 14) {
      setAbhaId(cleanValue);
      setValidationError('');
      
      if (cleanValue.length > 0 && cleanValue.length !== 14) {
        setValidationError('ABHA ID must be exactly 14 digits');
      }
    }
  };

  // Handle ABHA linking
  const handleLinkABHA = async () => {
    if (!validateABHAId(abhaId)) {
      setValidationError('Invalid ABHA ID format. Please enter 14 digits.');
      return;
    }

    if (!consentGiven) {
      setValidationError('Please provide consent to link ABHA ID.');
      return;
    }

    setIsLinking(true);
    setValidationError('');

    try {
      const result = await linkABHA({
        abha_id: abhaId,
        otp_method: 'mobile', // Default for now
        consent_given: consentGiven
      });

      if (result.success) {
        setShowLinkDialog(false);
        setAbhaId('');
        setConsentGiven(false);
      }
    } catch (err) {
      console.error('Error linking ABHA:', err);
    } finally {
      setIsLinking(false);
    }
  };

  // Handle ABHA unlinking
  const handleUnlinkABHA = async () => {
    try {
      await unlinkABHA();
    } catch (err) {
      console.error('Error unlinking ABHA:', err);
    }
  };

  // Handle consent toggle
  const handleConsentToggle = async (checked: boolean) => {
    if (abhaProfile?.abha_id) {
      try {
        await updateABHAConsent(checked);
      } catch (err) {
        console.error('Error updating consent:', err);
      }
    }
  };

  // Handle data sync
  const handleSyncData = async () => {
    setIsSyncing(true);
    try {
      await syncABHAData();
    } catch (err) {
      console.error('Error syncing ABHA data:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  // Get status badge
  const getStatusBadge = () => {
    if (!abhaProfile?.abha_id) {
      return <Badge variant="secondary">Not Linked</Badge>;
    }

    switch (abhaProfile.abha_sync_status) {
      case 'linked':
        return <Badge variant="default">Linked</Badge>;
      case 'synced':
        return <Badge variant="success">Synced</Badge>;
      case 'sync_pending':
        return <Badge variant="secondary">Syncing...</Badge>;
      case 'error':
        return <Badge variant="destructive">Sync Error</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  // Get sync status icon
  const getSyncStatusIcon = () => {
    if (!abhaProfile?.abha_id) return null;

    switch (abhaProfile.abha_sync_status) {
      case 'linked':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'synced':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'sync_pending':
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              ABHA Health Account
            </CardTitle>
            <CardDescription>
              Link your Ayushman Bharat Health Account for seamless healthcare data sharing
            </CardDescription>
          </div>
          {getStatusBadge()}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}

        {!abhaProfile?.abha_id ? (
          // Not linked state
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              ABHA (Ayushman Bharat Health Account) is a 14-digit unique health ID that enables you to:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Share medical records across hospitals and labs</li>
                <li>Access your health data from ABDM-certified providers</li>
                <li>Maintain a unified health history</li>
              </ul>
            </div>

            <Dialog open={showLinkDialog} onOpenChange={setShowLinkDialog}>
              <DialogTrigger asChild>
                <Button className="w-full" disabled={loading}>
                  <Link className="h-4 w-4 mr-2" />
                  Link ABHA ID
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Link ABHA ID</DialogTitle>
                  <DialogDescription>
                    Enter your 14-digit ABHA ID to link your health account
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="abha-id">ABHA ID</Label>
                    <Input
                      id="abha-id"
                      type="text"
                      placeholder="Enter 14-digit ABHA ID"
                      value={formatABHAId(abhaId)}
                      onChange={(e) => handleABHAIdChange(e.target.value)}
                      maxLength={17} // 14 digits + 3 spaces
                    />
                    {validationError && (
                      <p className="text-sm text-destructive">{validationError}</p>
                    )}
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="consent"
                      checked={consentGiven}
                      onCheckedChange={setConsentGiven}
                    />
                    <Label htmlFor="consent" className="text-sm">
                      I consent to share my health data through ABHA
                    </Label>
                  </div>

                  <div className="text-xs text-muted-foreground">
                    By linking your ABHA ID, you agree to share your health data with 
                    ABDM-certified healthcare providers as per your consent preferences.
                  </div>
                </div>

                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setShowLinkDialog(false)}
                    disabled={isLinking}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleLinkABHA}
                    disabled={!abhaId || !consentGiven || isLinking}
                  >
                    {isLinking && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Link ABHA
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        ) : (
          // Linked state
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/50">
              <div className="space-y-1">
                <div className="font-medium">ABHA ID: {formatABHAId(abhaProfile.abha_id)}</div>
                <div className="text-sm text-muted-foreground flex items-center gap-2">
                  {getSyncStatusIcon()}
                  {abhaProfile.abha_linked_at && (
                    <span>
                      Linked on {format(new Date(abhaProfile.abha_linked_at), 'PPP')}
                    </span>
                  )}
                </div>
                {abhaProfile.abha_last_sync && (
                  <div className="text-xs text-muted-foreground">
                    Last synced: {format(new Date(abhaProfile.abha_last_sync), 'PPp')}
                  </div>
                )}
              </div>
              
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" disabled={loading}>
                    <Unlink className="h-4 w-4 mr-2" />
                    Unlink
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Unlink ABHA ID</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to unlink your ABHA ID? This will remove access to 
                      ABDM data sharing and you'll need to link it again if you want to restore connectivity.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleUnlinkABHA}>
                      Unlink ABHA
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>

            <Separator />

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="data-sharing-consent">Data Sharing Consent</Label>
                  <p className="text-sm text-muted-foreground">
                    Allow sharing health data with ABDM-certified providers
                  </p>
                </div>
                <Switch
                  id="data-sharing-consent"
                  checked={abhaProfile.abha_consent_given}
                  onCheckedChange={handleConsentToggle}
                  disabled={loading}
                />
              </div>

              {isABHAConfigured() && (
                <div className="space-y-2">
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={handleSyncData}
                    disabled={!canSyncABHA() || isSyncing}
                  >
                    {isSyncing ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Sync className="h-4 w-4 mr-2" />
                    )}
                    Sync Health Data
                  </Button>
                  
                  <p className="text-xs text-muted-foreground">
                    Fetch your latest health records from ABDM-connected healthcare providers
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
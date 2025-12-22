import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/auth/AuthContext';
import { useTheme } from '@/theme/ThemeContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { KeyRound, Shield, Loader2, Check, Eye, EyeOff, Sun, Moon, Monitor, Palette } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

const SettingsPage: React.FC = () => {
  const { setNewPin: updateAuthPin, login } = useAuth();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const { toast } = useToast();
  
  const [showPinDialog, setShowPinDialog] = useState(false);
  const [step, setStep] = useState<'current' | 'new' | 'confirm'>('current');
  const [currentPin, setCurrentPin] = useState(['', '', '', '', '']);
  const [newPinDigits, setNewPinDigits] = useState(['', '', '', '', '']);
  const [confirmPin, setConfirmPin] = useState(['', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPin, setShowPin] = useState(false);
  
  const currentPinRefs = useRef<(HTMLInputElement | null)[]>([]);
  const newPinRefs = useRef<(HTMLInputElement | null)[]>([]);
  const confirmPinRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (showPinDialog) {
      setTimeout(() => {
        if (step === 'current') currentPinRefs.current[0]?.focus();
        else if (step === 'new') newPinRefs.current[0]?.focus();
        else if (step === 'confirm') confirmPinRefs.current[0]?.focus();
      }, 100);
    }
  }, [showPinDialog, step]);

  const handlePinChange = (
    index: number,
    value: string,
    pinArray: string[],
    setPinArray: React.Dispatch<React.SetStateAction<string[]>>,
    refs: React.MutableRefObject<(HTMLInputElement | null)[]>
  ) => {
    if (!/^\d*$/.test(value)) return;
    
    const newArray = [...pinArray];
    newArray[index] = value.slice(-1);
    setPinArray(newArray);
    setError('');
    
    if (value && index < 4) {
      refs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (
    index: number,
    e: React.KeyboardEvent,
    pinArray: string[],
    setPinArray: React.Dispatch<React.SetStateAction<string[]>>,
    refs: React.MutableRefObject<(HTMLInputElement | null)[]>
  ) => {
    if (e.key === 'Backspace' && !pinArray[index] && index > 0) {
      refs.current[index - 1]?.focus();
    }
  };

  const resetDialog = () => {
    setStep('current');
    setCurrentPin(['', '', '', '', '']);
    setNewPinDigits(['', '', '', '', '']);
    setConfirmPin(['', '', '', '', '']);
    setError('');
    setShowPin(false);
  };

  const handleOpenDialog = () => {
    resetDialog();
    setShowPinDialog(true);
  };

  const handleVerifyCurrentPin = async () => {
    const pin = currentPin.join('');
    if (pin.length !== 5) {
      setError('Please enter all 5 digits');
      return;
    }
    
    setIsLoading(true);
    const result = await login(pin);
    setIsLoading(false);
    
    if (result.success) {
      setStep('new');
    } else {
      setError('Incorrect PIN');
    }
  };

  const handleSetNewPin = () => {
    const pin = newPinDigits.join('');
    if (pin.length !== 5) {
      setError('Please enter all 5 digits');
      return;
    }
    setStep('confirm');
  };

  const handleConfirmNewPin = async () => {
    const pin = newPinDigits.join('');
    const confirm = confirmPin.join('');
    
    if (confirm.length !== 5) {
      setError('Please enter all 5 digits');
      return;
    }
    
    if (pin !== confirm) {
      setError('PINs do not match');
      return;
    }
    
    setIsLoading(true);
    const result = await updateAuthPin(pin);
    setIsLoading(false);
    
    if (result.success) {
      toast({
        title: 'PIN Updated',
        description: 'Your PIN has been successfully changed.',
      });
      setShowPinDialog(false);
      resetDialog();
    } else {
      setError(result.error || 'Failed to update PIN');
    }
  };

  const renderPinInputs = (
    pinArray: string[],
    setPinArray: React.Dispatch<React.SetStateAction<string[]>>,
    refs: React.MutableRefObject<(HTMLInputElement | null)[]>
  ) => (
    <div className="flex gap-3 justify-center">
      {pinArray.map((digit, index) => (
        <Input
          key={index}
          ref={(el) => (refs.current[index] = el)}
          type={showPin ? 'text' : 'password'}
          inputMode="numeric"
          maxLength={1}
          value={digit}
          onChange={(e) => handlePinChange(index, e.target.value, pinArray, setPinArray, refs)}
          onKeyDown={(e) => handleKeyDown(index, e, pinArray, setPinArray, refs)}
          className="w-12 h-14 text-center text-2xl font-bold"
        />
      ))}
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground">Manage your app preferences and security</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Appearance Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="w-5 h-5 text-primary" />
              Appearance
            </CardTitle>
            <CardDescription>
              Customize the look and feel of the app
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <Label>Theme</Label>
              <div className="grid grid-cols-3 gap-3">
                <Button
                  variant={theme === 'light' ? 'default' : 'outline'}
                  className="flex flex-col gap-2 h-auto py-4"
                  onClick={() => setTheme('light')}
                >
                  <Sun className="w-5 h-5" />
                  <span className="text-xs">Light</span>
                </Button>
                <Button
                  variant={theme === 'dark' ? 'default' : 'outline'}
                  className="flex flex-col gap-2 h-auto py-4"
                  onClick={() => setTheme('dark')}
                >
                  <Moon className="w-5 h-5" />
                  <span className="text-xs">Dark</span>
                </Button>
                <Button
                  variant={theme === 'system' ? 'default' : 'outline'}
                  className="flex flex-col gap-2 h-auto py-4"
                  onClick={() => setTheme('system')}
                >
                  <Monitor className="w-5 h-5" />
                  <span className="text-xs">System</span>
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Current: {resolvedTheme === 'dark' ? 'Dark mode' : 'Light mode'}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Security Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              Security
            </CardTitle>
            <CardDescription>
              Manage your authentication and security preferences
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <KeyRound className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">Change PIN</p>
                  <p className="text-sm text-muted-foreground">Update your 5-digit PIN</p>
                </div>
              </div>
              <Button onClick={handleOpenDialog}>
                Change
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* App Info */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>About</CardTitle>
            <CardDescription>
              Application information
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-3 gap-4">
              <div className="flex justify-between sm:flex-col sm:items-start p-3 rounded-lg bg-muted/50">
                <span className="text-muted-foreground text-sm">Version</span>
                <span className="font-medium">1.0.0</span>
              </div>
              <div className="flex justify-between sm:flex-col sm:items-start p-3 rounded-lg bg-muted/50">
                <span className="text-muted-foreground text-sm">Session Timeout</span>
                <span className="font-medium">24 hours</span>
              </div>
              <div className="flex justify-between sm:flex-col sm:items-start p-3 rounded-lg bg-muted/50">
                <span className="text-muted-foreground text-sm">Data Storage</span>
                <span className="font-medium">Cloud</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Change PIN Dialog */}
      <Dialog open={showPinDialog} onOpenChange={setShowPinDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {step === 'current' && 'Enter Current PIN'}
              {step === 'new' && 'Enter New PIN'}
              {step === 'confirm' && 'Confirm New PIN'}
            </DialogTitle>
            <DialogDescription>
              {step === 'current' && 'Please enter your current PIN to continue'}
              {step === 'new' && 'Enter your new 5-digit PIN'}
              {step === 'confirm' && 'Re-enter your new PIN to confirm'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {step === 'current' && renderPinInputs(currentPin, setCurrentPin, currentPinRefs)}
            {step === 'new' && renderPinInputs(newPinDigits, setNewPinDigits, newPinRefs)}
            {step === 'confirm' && renderPinInputs(confirmPin, setConfirmPin, confirmPinRefs)}

            <div className="flex justify-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowPin(!showPin)}
                className="text-muted-foreground"
              >
                {showPin ? (
                  <>
                    <EyeOff className="w-4 h-4 mr-2" />
                    Hide PIN
                  </>
                ) : (
                  <>
                    <Eye className="w-4 h-4 mr-2" />
                    Show PIN
                  </>
                )}
              </Button>
            </div>

            {error && (
              <p className="text-center text-sm text-destructive">{error}</p>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowPinDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (step === 'current') handleVerifyCurrentPin();
                else if (step === 'new') handleSetNewPin();
                else handleConfirmNewPin();
              }}
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : step === 'confirm' ? (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Save PIN
                </>
              ) : (
                'Continue'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SettingsPage;

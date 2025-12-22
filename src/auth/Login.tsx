import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { Wallet, Lock, AlertCircle, Plus } from 'lucide-react';

const Login: React.FC = () => {
  const [pin, setPin] = useState(['', '', '', '', '']);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState<'login' | 'setup'>('login');
  const [confirmPin, setConfirmPin] = useState(['', '', '', '', '']);
  const [step, setStep] = useState<'enter' | 'confirm'>('enter');
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const confirmRefs = useRef<(HTMLInputElement | null)[]>([]);
  const { login, setNewPin, isAuthenticated, isPinSet, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading) {
      if (!isPinSet) {
        setMode('setup');
      }
      inputRefs.current[0]?.focus();
    }
  }, [authLoading, isPinSet]);

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const handleChange = (index: number, value: string, isConfirm = false) => {
    if (!/^\d*$/.test(value)) return;

    const refs = isConfirm ? confirmRefs : inputRefs;
    const setter = isConfirm ? setConfirmPin : setPin;
    const currentPin = isConfirm ? confirmPin : pin;

    const newPin = [...currentPin];
    newPin[index] = value.slice(-1);
    setter(newPin);
    setError('');

    if (value && index < 4) {
      refs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent, isConfirm = false) => {
    const refs = isConfirm ? confirmRefs : inputRefs;
    const currentPin = isConfirm ? confirmPin : pin;
    
    if (e.key === 'Backspace' && !currentPin[index] && index > 0) {
      refs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent, isConfirm = false) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 5);
    const setter = isConfirm ? setConfirmPin : setPin;
    const refs = isConfirm ? confirmRefs : inputRefs;
    const currentPin = isConfirm ? confirmPin : pin;
    
    const newPin = [...currentPin];
    for (let i = 0; i < pasted.length; i++) {
      newPin[i] = pasted[i];
    }
    setter(newPin);
    if (pasted.length === 5) {
      refs.current[4]?.focus();
    } else {
      refs.current[pasted.length]?.focus();
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const fullPin = pin.join('');
    
    if (fullPin.length !== 5) {
      setError('Please enter a 5-digit PIN');
      return;
    }

    setIsLoading(true);
    const result = await login(fullPin);
    setIsLoading(false);

    if (result.success) {
      navigate('/');
    } else {
      setError(result.error || 'Invalid PIN');
      setPin(['', '', '', '', '']);
      inputRefs.current[0]?.focus();
    }
  };

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (step === 'enter') {
      const fullPin = pin.join('');
      if (fullPin.length !== 5) {
        setError('Please enter a 5-digit PIN');
        return;
      }
      setStep('confirm');
      setConfirmPin(['', '', '', '', '']);
      setTimeout(() => confirmRefs.current[0]?.focus(), 100);
      return;
    }

    const fullPin = pin.join('');
    const fullConfirm = confirmPin.join('');

    if (fullConfirm.length !== 5) {
      setError('Please confirm your PIN');
      return;
    }

    if (fullPin !== fullConfirm) {
      setError('PINs do not match. Please try again.');
      setStep('enter');
      setPin(['', '', '', '', '']);
      setConfirmPin(['', '', '', '', '']);
      inputRefs.current[0]?.focus();
      return;
    }

    setIsLoading(true);
    const result = await setNewPin(fullPin);
    setIsLoading(false);

    if (result.success) {
      navigate('/');
    } else {
      setError(result.error || 'Failed to set PIN');
    }
  };

  const renderPinInputs = (values: string[], isConfirm = false) => {
    const refs = isConfirm ? confirmRefs : inputRefs;
    return (
      <div 
        className="flex gap-3 justify-center mb-6" 
        onPaste={(e) => handlePaste(e, isConfirm)}
      >
        {values.map((digit, index) => (
          <input
            key={index}
            ref={(el) => (refs.current[index] = el)}
            type="password"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e) => handleChange(index, e.target.value, isConfirm)}
            onKeyDown={(e) => handleKeyDown(index, e, isConfirm)}
            className="w-14 h-16 text-center text-2xl font-bold rounded-xl border-2 border-border bg-background transition-all duration-200 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
            disabled={isLoading}
          />
        ))}
      </div>
    );
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-secondary/30 p-4">
      <div className="w-full max-w-md animate-fade-in">
        {/* Logo and Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-primary text-primary-foreground mb-6 shadow-lg">
            <Wallet className="w-10 h-10" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Family Budget Planner
          </h1>
          <p className="text-muted-foreground">
            {mode === 'setup' 
              ? step === 'enter' 
                ? 'Create your 5-digit PIN to secure your data'
                : 'Confirm your PIN'
              : 'Enter your 5-digit PIN to continue'}
          </p>
        </div>

        {/* Login/Setup Card */}
        <div className="bg-card rounded-2xl shadow-card p-8 border border-border">
          <form onSubmit={mode === 'setup' ? handleSetup : handleLogin}>
            <div className="flex items-center gap-2 mb-6 text-muted-foreground">
              {mode === 'setup' ? (
                <>
                  <Plus className="w-4 h-4" />
                  <span className="text-sm font-medium">
                    {step === 'enter' ? 'Create New PIN' : 'Confirm PIN'}
                  </span>
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  <span className="text-sm font-medium">Secure PIN Entry</span>
                </>
              )}
            </div>

            {/* PIN Input */}
            {mode === 'setup' && step === 'confirm' 
              ? renderPinInputs(confirmPin, true)
              : renderPinInputs(pin)
            }

            {/* Error Message */}
            {error && (
              <div className="flex items-center gap-2 p-3 mb-6 rounded-lg bg-destructive/10 text-destructive text-sm animate-slide-up">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading || (mode === 'setup' && step === 'confirm' ? confirmPin.some((d) => !d) : pin.some((d) => !d))}
              className="w-full py-4 px-6 rounded-xl font-semibold text-primary-foreground bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-md hover:shadow-lg"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  {mode === 'setup' ? 'Setting up...' : 'Verifying...'}
                </span>
              ) : mode === 'setup' ? (
                step === 'enter' ? 'Continue' : 'Create PIN'
              ) : (
                'Unlock'
              )}
            </button>

            {mode === 'setup' && step === 'confirm' && (
              <button
                type="button"
                onClick={() => {
                  setStep('enter');
                  setConfirmPin(['', '', '', '', '']);
                  inputRefs.current[0]?.focus();
                }}
                className="w-full mt-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Go back
              </button>
            )}
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-muted-foreground mt-6">
          Your financial data is stored securely
        </p>
      </div>
    </div>
  );
};

export default Login;

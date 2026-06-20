'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { ConfirmationResult, sendSignInLinkToEmail, isSignInWithEmailLink, signInWithEmailLink } from 'firebase/auth';
import { firebaseAuth, sendOtp, verifyOtp } from '@/lib/firebase-client';
import { executeRecaptcha, cleanupEnterpriseRecaptcha } from '@/lib/recaptcha-client';

const PHONE_REGEX = /^\+91[6-9]\d{9}$/;

function generateDeviceFingerprint() {
  if (typeof window === 'undefined') return '';
  const components = [
    navigator.userAgent,
    navigator.language,
    window.screen.width + 'x' + window.screen.height,
    window.screen.colorDepth,
    new Date().getTimezoneOffset(),
    navigator.hardwareConcurrency || 'unknown',
    navigator.platform || 'unknown'
  ];
  return btoa(components.join('|')).substring(0, 64);
}

function getDeviceName() {
  if (typeof window === 'undefined') return 'Unknown Device';
  const ua = navigator.userAgent;
  if (/iPhone/.test(ua)) return 'iPhone';
  if (/iPad/.test(ua)) return 'iPad';
  if (/Android/.test(ua)) return 'Android Device';
  if (/Windows/.test(ua)) return 'Windows PC';
  if (/Mac/.test(ua)) return 'Mac';
  if (/Linux/.test(ua)) return 'Linux PC';
  return 'Browser Device';
}

function WorkerLoginInner() {
  const searchParams = useSearchParams();
  const refCode = searchParams.get('ref') || null;
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [pin, setPin] = useState('');
  const [email, setEmail] = useState('');
  const [step, setStep] = useState<'PHONE' | 'OTP' | 'PIN' | 'EMAIL'>('PHONE');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [hasEmail, setHasEmail] = useState(false);

  const confirmationResultRef = useRef<ConfirmationResult | null>(null);

  useEffect(() => {
    console.log("Worker login component mounted");

    // Check for email auth link
    if (isSignInWithEmailLink(firebaseAuth, window.location.href)) {
      let savedEmail = window.localStorage.getItem('emailForSignIn');
      if (!savedEmail) {
        savedEmail = window.prompt('Please enter your email to complete verification');
      }
      if (savedEmail) {
        setLoading(true);
        signInWithEmailLink(firebaseAuth, savedEmail, window.location.href)
          .then(async (result) => {
            const idToken = await result.user.getIdToken();
            const response = await fetch('/api/auth/verify-firebase-token', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                idToken,
                role: 'worker',
                ref_code: refCode,
                deviceFingerprint: generateDeviceFingerprint(),
                deviceName: getDeviceName()
              })
            });
            const data = await response.json();
            if (response.ok) {
              if (data.deviceToken) {
                localStorage.setItem('volo_device_token', data.deviceToken);
              }
              window.location.href = data.redirectTo || '/worker/kyc';
            } else {
              setErrorMsg(data.error || 'Email link authentication failed');
              setLoading(false);
            }
          })
          .catch((err) => {
            console.error(err);
            setErrorMsg('Failed to log in using email link. Link may be expired.');
            setLoading(false);
          });
      }
    }
  }, [refCode]);

  const triggerFirebaseOtp = async (formattedPhone: string) => {
    try {
      // Clean up reCAPTCHA Enterprise script and global window objects
      // to avoid conflict with Firebase's internal reCAPTCHA Verifier.
      cleanupEnterpriseRecaptcha();
      console.log("Sending OTP to:", formattedPhone);
      const result = await sendOtp(formattedPhone);
      confirmationResultRef.current = result;
      setStep('OTP');
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/invalid-phone-number') {
        setErrorMsg('Enter a valid 10-digit Indian mobile number');
      } else if (err.code === 'auth/too-many-requests') {
        setErrorMsg('Too many OTP attempts. Please login via PIN/Email or try again later.');
      } else if (err.code === 'auth/invalid-app-credential') {
        setErrorMsg('App verification failed (auth/invalid-app-credential). Check authorized domains, API key configuration, or Blaze billing on Firebase.');
      } else {
        setErrorMsg('Could not send OTP. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);

    const formattedPhone = phoneNumber.startsWith('+91') ? phoneNumber : `+91${phoneNumber}`;
    if (!PHONE_REGEX.test(formattedPhone)) {
      setErrorMsg('Enter a valid 10-digit Indian mobile number');
      setLoading(false);
      return;
    }

    try {
      const recaptchaToken = await executeRecaptcha('LOGIN');
      const response = await fetch('/api/auth/pre-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: formattedPhone,
          deviceToken: localStorage.getItem('volo_device_token') || null,
          recaptchaToken
        })
      });

      const data = await response.json();

      if (!response.ok) {
        mapServerErrors(data.error || 'FAILED');
        setLoading(false);
        return;
      }

      setHasEmail(data.hasEmail || false);

      if (data.authMethod === 'trusted_device') {
        const loginRes = await fetch('/api/auth/trusted-device-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phone: formattedPhone,
            deviceToken: localStorage.getItem('volo_device_token'),
            deviceFingerprint: generateDeviceFingerprint()
          })
        });

        const loginData = await loginRes.json();

        if (loginRes.ok && loginData.success) {
          if (loginData.newDeviceToken) {
            localStorage.setItem('volo_device_token', loginData.newDeviceToken);
          }
          window.location.href = loginData.redirectTo || '/worker/kyc';
        } else {
          await triggerFirebaseOtp(formattedPhone);
        }
      } else if (data.authMethod === 'pin_required') {
        setStep('PIN');
        setLoading(false);
      } else {
        await triggerFirebaseOtp(formattedPhone);
      }

    } catch (err) {
      console.error(err);
      setErrorMsg('Pre-check failed. Attempting direct OTP login.');
      await triggerFirebaseOtp(formattedPhone);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    if (otp.length !== 6) {
      setErrorMsg('Incorrect OTP. Please check and retry.');
      setLoading(false);
      return;
    }

    try {
      if (!confirmationResultRef.current) {
        throw new Error('NO_CONFIRMATION_RESULT');
      }

      const idToken = await verifyOtp(confirmationResultRef.current, otp);

      const response = await fetch('/api/auth/verify-firebase-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          idToken,
          role: 'worker',
          ref_code: refCode,
          deviceFingerprint: generateDeviceFingerprint(),
          deviceName: getDeviceName()
        })
      });

      const data = await response.json();

      if (!response.ok) {
        mapServerErrors(data.error || 'FIREBASE_TOKEN_INVALID');
        return;
      }

      if (data.deviceToken) {
        localStorage.setItem('volo_device_token', data.deviceToken);
      }

      window.location.href = data.redirectTo || '/worker/kyc';
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/invalid-verification-code') {
        setErrorMsg('Incorrect OTP. Please check and retry.');
      } else if (err.code === 'auth/code-expired') {
        setErrorMsg('OTP has expired. Request a new one.');
      } else {
        setErrorMsg('Incorrect OTP. Please check and retry.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyPin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    const formattedPhone = phoneNumber.startsWith('+91') ? phoneNumber : `+91${phoneNumber}`;

    try {
      const recaptchaToken = await executeRecaptcha('LOGIN');
      const response = await fetch('/api/auth/pin-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: formattedPhone,
          pin,
          recaptchaToken
        })
      });

      const data = await response.json();

      if (!response.ok) {
        setErrorMsg(data.error || 'Incorrect PIN');
        setLoading(false);
        return;
      }

      window.location.href = data.redirectTo || '/worker/kyc';
    } catch (err) {
      console.error(err);
      setErrorMsg('Incorrect PIN. Please try again.');
      setLoading(false);
    }
  };

  const handleSendEmailLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      const actionCodeSettings = {
        url: window.location.origin + window.location.pathname,
        handleCodeInApp: true,
      };

      await sendSignInLinkToEmail(firebaseAuth, email, actionCodeSettings);
      window.localStorage.setItem('emailForSignIn', email);
      setSuccessMsg('A secure sign-in link has been sent to your email.');
    } catch (err: any) {
      console.error(err);
      setErrorMsg('Failed to send login link. Make sure email is correct.');
    } finally {
      setLoading(false);
    }
  };

  const mapServerErrors = (code: string) => {
    setLoading(false);
    switch (code) {
      case 'INVALID_PHONE':
        setErrorMsg('Enter a valid 10-digit Indian mobile number');
        break;
      case 'ACCOUNT_BLOCKED':
        setErrorMsg('Account suspended. Contact support.');
        break;
      case 'UNAUTHORIZED_ROLE':
        setErrorMsg("You don't have access to this portal.");
        break;
      case 'KYC_REJECTED':
        setErrorMsg('KYC rejected. Contact support at help@volo.in');
        break;
      case 'FIREBASE_TOKEN_INVALID':
        setErrorMsg('Session expired. Please login again.');
        break;
      default:
        setErrorMsg(code.includes('attempts') ? code : 'Authentication failed. Please retry.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl space-y-6">
        <div className="flex flex-col items-center text-center space-y-2">
          <img 
            src="/images/logo.jpeg" 
            alt="VOLO Logo" 
            className="h-12 w-12 rounded-xl object-contain border border-slate-800 shadow-md animate-pulse" 
          />
          <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent font-sans">Worker Portal</h1>
          <p className="text-slate-400 text-sm">
            {step === 'PHONE' && 'Enter your phone number to sign in or register'}
            {step === 'OTP' && 'Enter the 6-digit confirmation code sent to your mobile'}
            {step === 'PIN' && 'Welcome back! Enter your secure PIN to log in'}
            {step === 'EMAIL' && 'Enter your registered email to receive a secure link'}
          </p>
        </div>

        {errorMsg && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-sm text-center">
            {errorMsg}
          </div>
        )}

        {successMsg && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg text-sm text-center">
            {successMsg}
          </div>
        )}

        {step === 'PHONE' && (
          <form onSubmit={handlePhoneSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs text-slate-400 font-medium">Mobile Number</label>
              <div className="flex rounded-lg bg-slate-950 border border-slate-800 focus-within:border-emerald-500 transition-colors">
                <span className="flex items-center pl-3 text-slate-500 font-medium text-sm">+91</span>
                <input
                  type="tel"
                  placeholder="9876543210"
                  maxLength={10}
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                  className="w-full bg-transparent px-3 py-2.5 text-sm outline-none text-white placeholder-slate-600"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || phoneNumber.length < 10}
              className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:from-emerald-600/50 disabled:to-teal-600/50 text-white font-medium rounded-lg py-2.5 text-sm transition-all flex justify-center items-center gap-2 cursor-pointer"
            >
              {loading ? (
                <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                'Continue'
              )}
            </button>
          </form>
        )}

        {step === 'OTP' && (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs text-slate-400 font-medium">OTP Code</label>
              <input
                type="text"
                maxLength={6}
                placeholder="123456"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 text-center tracking-[0.5em] font-mono text-lg rounded-lg px-3 py-2.5 outline-none transition-colors"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading || otp.length !== 6}
              className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:from-emerald-600/50 disabled:to-teal-600/50 text-white font-medium rounded-lg py-2.5 text-sm transition-all flex justify-center items-center gap-2 cursor-pointer"
            >
              {loading ? (
                <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                'Verify & Login'
              )}
            </button>

            <div className="space-y-2">
              <button
                type="button"
                onClick={() => {
                  setStep('PHONE');
                  setOtp('');
                  setErrorMsg(null);
                }}
                className="w-full bg-transparent border border-slate-800 hover:bg-slate-800 text-slate-400 font-medium rounded-lg py-2.5 text-sm transition-colors text-center cursor-pointer"
              >
                Change Phone Number
              </button>

              {hasEmail && (
                <button
                  type="button"
                  onClick={() => {
                    setStep('EMAIL');
                    setErrorMsg(null);
                  }}
                  className="w-full bg-transparent text-emerald-400 hover:text-emerald-300 font-medium py-1.5 text-xs text-center cursor-pointer"
                >
                  Or Login with Email Link (Free)
                </button>
              )}
            </div>
          </form>
        )}

        {step === 'PIN' && (
          <form onSubmit={handleVerifyPin} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs text-slate-400 font-medium">Enter secure PIN</label>
              <input
                type="password"
                maxLength={6}
                placeholder="••••"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 text-center tracking-[0.5em] font-mono text-lg rounded-lg px-3 py-2.5 outline-none transition-colors"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading || pin.length < 4}
              className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:from-emerald-600/50 disabled:to-teal-600/50 text-white font-medium rounded-lg py-2.5 text-sm transition-all flex justify-center items-center gap-2 cursor-pointer"
            >
              {loading ? (
                <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                'Login with PIN'
              )}
            </button>

            <div className="space-y-2">
              <button
                type="button"
                onClick={async () => {
                  setErrorMsg(null);
                  setLoading(true);
                  const formattedPhone = phoneNumber.startsWith('+91') ? phoneNumber : `+91${phoneNumber}`;
                  await triggerFirebaseOtp(formattedPhone);
                }}
                className="w-full bg-transparent border border-slate-800 hover:bg-slate-800 text-slate-400 font-medium rounded-lg py-2.5 text-sm transition-colors text-center cursor-pointer"
              >
                Forgot PIN / Use SMS OTP
              </button>

              {hasEmail && (
                <button
                  type="button"
                  onClick={() => {
                    setStep('EMAIL');
                    setErrorMsg(null);
                  }}
                  className="w-full bg-transparent text-emerald-400 hover:text-emerald-300 font-medium py-1.5 text-xs text-center cursor-pointer"
                >
                  Or Login with Email Link (Free)
                </button>
              )}
            </div>
          </form>
        )}

        {step === 'EMAIL' && (
          <form onSubmit={handleSendEmailLink} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs text-slate-400 font-medium">Email Address</label>
              <input
                type="email"
                placeholder="yourname@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-lg px-3 py-2.5 outline-none transition-colors text-sm"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading || !email}
              className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:from-emerald-600/50 disabled:to-teal-600/50 text-white font-medium rounded-lg py-2.5 text-sm transition-all flex justify-center items-center gap-2 cursor-pointer"
            >
              {loading ? (
                <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                'Send Login Link'
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setStep('PHONE');
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className="w-full bg-transparent border border-slate-800 hover:bg-slate-800 text-slate-400 font-medium rounded-lg py-2.5 text-sm transition-colors text-center cursor-pointer"
            >
              Back to Phone Login
            </button>
          </form>
        )}

        <div id="recaptcha-container"></div>
      </div>
    </div>
  );
}

export default function WorkerLoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <span className="h-8 w-8 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
      </div>
    }>
      <WorkerLoginInner />
    </Suspense>
  );
}

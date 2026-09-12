import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { ClientResponseError } from 'pocketbase';
import type { RecordModel } from 'pocketbase';
import { pb } from '../services/pocketbaseClient';
import { NotApprovedError } from './NotApprovedError';

interface AuthContextValue {
  user: RecordModel | null;
  isAuthenticated: boolean;
  requestOtp: (email: string) => Promise<string>;
  confirmOtp: (otpId: string, code: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  // pb.authStore persists to localStorage and rehydrates on load, so a
  // signed-in person stays signed in across reloads without extra code here.
  const [user, setUser] = useState<RecordModel | null>(pb.authStore.record);

  useEffect(() => {
    return pb.authStore.onChange(() => {
      setUser(pb.authStore.record);
    });
  }, []);

  useEffect(() => {
    // A persisted token can outlive the account it points to (e.g. local dev
    // data getting reset). The SDK's own isValid/record checks are purely
    // client-side (token shape + expiry), so a stale-but-unexpired token
    // still renders as "signed in" until an API call actually fails - sign
    // out proactively instead of leaving that broken half-signed-in state.
    if (!pb.authStore.isValid) return;
    pb.collection('users')
      .authRefresh()
      .catch(() => pb.authStore.clear());
  }, []);

  async function requestOtp(email: string): Promise<string> {
    const { otpId } = await pb.collection('users').requestOTP(email);
    return otpId;
  }

  async function confirmOtp(otpId: string, code: string): Promise<void> {
    await pb.collection('users').authWithOTP(otpId, code);
  }

  async function signInWithGoogle(): Promise<void> {
    try {
      await pb.collection('users').authWithOAuth2({ provider: 'google' });
    } catch (err) {
      // The guard hook's ForbiddenError surfaces here as a 403. Anything else
      // (network failure, cancelled popup, provider error) rethrows unchanged
      // so the caller can treat it generically.
      if (err instanceof ClientResponseError && err.status === 403) {
        throw new NotApprovedError();
      }
      throw err;
    }
  }

  function signOut(): void {
    pb.authStore.clear();
  }

  return (
    <AuthContext.Provider
      value={{ user, isAuthenticated: !!user, requestOtp, confirmOtp, signInWithGoogle, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}

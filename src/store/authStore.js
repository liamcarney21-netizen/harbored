import { create } from 'zustand';
import { supabase } from '../lib/supabase';

const ALREADY = 'That email already has a Harbored account — sign in below instead.';

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('auth init timed out')), ms)),
  ]);
}

export const useAuthStore = create((set) => ({
  user: null,
  initialized: false,
  recovering: false, // a password-recovery link was just opened

  init: async () => {
    try {
      const { data: { session } } = await withTimeout(supabase.auth.getSession(), 10000);
      set({ user: session?.user ?? null, initialized: true });
    } catch (e) {
      console.error('Auth init failed:', e?.message || e);
      // The app must still render (as signed out) rather than sit blank.
      set({ user: null, initialized: true });
    }
    supabase.auth.onAuthStateChange((event, session) => {
      set({ user: session?.user ?? null, initialized: true, recovering: event === 'PASSWORD_RECOVERY' });
    });
  },

  signUp: async (email, password, name) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    });
    if (error) {
      const exists = error.code === 'user_already_exists' || /already registered/i.test(error.message);
      return { error: exists ? ALREADY : error.message };
    }
    // Supabase obfuscates existing emails: signUp "succeeds" with a user that
    // has no identities. Treating that as a fresh account would drop the
    // person half into someone's existing data — surface it instead.
    if (data.user && (data.user.identities?.length ?? 0) === 0) {
      return { error: ALREADY };
    }
    // With email confirmation on there is no session yet; the user is set by
    // the auth listener once they confirm. Don't pretend they're signed in.
    if (!data.session) return { error: null, needsConfirmation: true };
    set({ user: data.user, initialized: true });
    return { error: null };
  },

  signIn: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    set({ user: data.user, initialized: true });
    return { error: null };
  },

  // Local sign-out only: other devices keep their sessions. The local session
  // is cleared even if the network call fails, so sign-out always sticks.
  logout: async () => {
    const { error } = await supabase.auth.signOut({ scope: 'local' });
    if (error) console.error('Sign-out:', error.message);
    set({ user: null, recovering: false });
  },
}));

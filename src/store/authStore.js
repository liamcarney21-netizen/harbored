import { create } from 'zustand';
import { supabase } from '../lib/supabase';

export const useAuthStore = create((set) => ({
  user: null,
  initialized: false,

  init: async () => {
    const { data: { session } } = await supabase.auth.getSession();
    set({ user: session?.user ?? null, initialized: true });
    supabase.auth.onAuthStateChange((_event, session) => {
      set({ user: session?.user ?? null, initialized: true });
    });
  },

  signUp: async (email, password, name) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    });
    const alreadyMsg = 'That email already has a Harbored account — sign in below instead.';
    if (error) {
      return { error: /already registered/i.test(error.message) ? alreadyMsg : error.message };
    }
    // Supabase obfuscates existing emails: signUp "succeeds" with a user that
    // has no identities. Treating that as a fresh account silently drops the
    // person into (or half into) someone's existing data — surface it instead.
    if (data.user && (data.user.identities?.length ?? 0) === 0) {
      return { error: alreadyMsg };
    }
    set({ user: data.user, initialized: true });
    return { error: null };
  },

  signIn: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    set({ user: data.user, initialized: true });
    return { error: null };
  },

  logout: async () => {
    await supabase.auth.signOut();
    set({ user: null });
  },
}));

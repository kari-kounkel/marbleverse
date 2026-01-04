import { createClient } from '@supabase/supabase-js';
import { AppState } from '../types';

const SUPABASE_URL = 'https://your-project-url.supabase.co';
const SUPABASE_KEY = 'your-anon-key';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export async function loginWithMagicLink(email: string) {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: window.location.origin,
    },
  });
  return { error };
}

export async function saveToCloud(state: AppState) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No user logged in");

  const { error } = await supabase
    .from('vaults')
    .upsert({ user_id: user.id, blob: state }, { onConflict: 'user_id' });

  return { error };
}

export async function restoreFromCloud(): Promise<{ data: AppState | null; error: any }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No user logged in");

  const { data, error } = await supabase
    .from('vaults')
    .select('blob')
    .eq('user_id', user.id)
    .single();

  if (error && error.code === 'PGRST116') {
      return { data: null, error: null };
  }

  return { data: data?.blob as AppState, error };
}
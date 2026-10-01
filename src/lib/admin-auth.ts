// Admin authentication utilities
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const adminSupabase = createClient(supabaseUrl, supabaseAnonKey);

export type AdminUser = {
  id: string;
  email: string;
  name: string | null;
};

export async function adminLogin(email: string, password: string): Promise<{ user: AdminUser | null; error: string | null }> {
  try {
    // Llamar a edge function para verificar credenciales
    const { data, error } = await adminSupabase.functions.invoke("admin-auth", {
      body: { action: "login", email, password },
    });

    if (error) throw error;
    if (data?.error) return { user: null, error: data.error };

    // Guardar sesión en localStorage
    if (data?.user) {
      localStorage.setItem("admin_session", JSON.stringify(data.user));
    }

    return { user: data?.user ?? null, error: null };
  } catch (e) {
    return { user: null, error: e instanceof Error ? e.message : "Error de conexión" };
  }
}

export async function adminLogout(): Promise<void> {
  localStorage.removeItem("admin_session");
  try {
    await adminSupabase.functions.invoke("admin-auth", { body: { action: "logout" } });
  } catch {
    // Ignorar errores de logout
  }
}

export function getAdminSession(): AdminUser | null {
  try {
    const stored = localStorage.getItem("admin_session");
    if (stored) return JSON.parse(stored);
  } catch {
    // Ignorar errores de parseo
  }
  return null;
}

export async function verifyAdminSession(): Promise<AdminUser | null> {
  try {
    const { data, error } = await adminSupabase.functions.invoke("admin-auth", {
      body: { action: "verify" },
    });
    if (error) throw error;
    if (data?.user) {
      localStorage.setItem("admin_session", JSON.stringify(data.user));
      return data.user;
    }
    return null;
  } catch {
    localStorage.removeItem("admin_session");
    return null;
  }
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<{ user: AdminUser | null; error: string | null }> {
  try {
    const { data, error } = await adminSupabase.functions.invoke("admin-auth", {
      body: { action: "change-password", currentPassword, newPassword },
    });
    if (error) throw error;
    if (data?.error) return { user: null, error: data.error };
    if (data?.user) {
      localStorage.setItem("admin_session", JSON.stringify(data.user));
    }
    return { user: data?.user ?? null, error: null };
  } catch (e) {
    return { user: null, error: e instanceof Error ? e.message : "Error de conexión" };
  }
}
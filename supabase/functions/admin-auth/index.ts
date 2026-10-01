// Admin authentication edge function - usando Web Crypto API (compatible con Deno)
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ADMIN_SESSION_COOKIE = "admin_session";

const adminSupabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// PBKDF2 con Web Crypto API (compatible con Deno)
async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits"]
  );
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt,
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    256
  );
  const hashArray = new Uint8Array(derivedBits);
  // Formato: algorithm$iterations$salt$hash (base64)
  return `pbkdf2_sha256$100000$${btoa(String.fromCharCode(...salt))}$${btoa(String.fromCharCode(...hashArray))}`;
}

async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  try {
    // Formato esperado: pbkdf2_sha256$iterations$salt$hash
    const parts = storedHash.split("$");
    if (parts.length !== 4 || parts[0] !== "pbkdf2_sha256") {
      return false;
    }
    const iterations = parseInt(parts[1], 10);
    const salt = Uint8Array.from(atob(parts[2]), c => c.charCodeAt(0));
    const storedHashBytes = Uint8Array.from(atob(parts[3]), c => c.charCodeAt(0));

    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      "raw",
      encoder.encode(password),
      { name: "PBKDF2" },
      false,
      ["deriveBits"]
    );
    const derivedBits = await crypto.subtle.deriveBits(
      {
        name: "PBKDF2",
        salt,
        iterations,
        hash: "SHA-256",
      },
      keyMaterial,
      256
    );
    const derivedArray = new Uint8Array(derivedBits);
    // Comparación en tiempo constante
    if (derivedArray.length !== storedHashBytes.length) return false;
    let diff = 0;
    for (let i = 0; i < derivedArray.length; i++) {
      diff |= derivedArray[i] ^ storedHashBytes[i];
    }
    return diff === 0;
  } catch {
    return false;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { action, email, password } = await req.json();

    switch (action) {
      case "login": {
        if (!email || !password) {
          return json({ error: "Email y contraseña requeridos" }, 400);
        }

        // Buscar admin
        const { data: admin, error } = await adminSupabase
          .from("admin_users")
          .select("id, email, password_hash, name")
          .eq("email", email.toLowerCase())
          .single();

        if (error || !admin) {
          return json({ error: "Credenciales inválidas" }, 401);
        }

        // Verificar password con PBKDF2
        const valid = await verifyPassword(password, admin.password_hash);
        if (!valid) {
          return json({ error: "Credenciales inválidas" }, 401);
        }

        const user = { id: admin.id, email: admin.email, name: admin.name };
        return json({ user }, 200, { "Set-Cookie": `${ADMIN_SESSION_COOKIE}=${btoa(JSON.stringify(user))}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400` });
      }

      case "logout": {
        return json({ success: true }, 200, { "Set-Cookie": `${ADMIN_SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0` });
      }

      case "verify": {
        const cookie = req.headers.get("Cookie") || "";
        const match = cookie.match(new RegExp(`${ADMIN_SESSION_COOKIE}=([^;]+)`));
        if (!match) return json({ user: null }, 200);

        try {
          const user = JSON.parse(atob(match[1]));
          // Verificar que el admin sigue existiendo
          const { data: admin } = await adminSupabase
            .from("admin_users")
            .select("id, email, name")
            .eq("id", user.id)
            .single();

          if (!admin) {
            return json({ user: null }, 200, { "Set-Cookie": `${ADMIN_SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0` });
          }

          return json({ user: { id: admin.id, email: admin.email, name: admin.name } }, 200);
        } catch {
          return json({ user: null }, 200, { "Set-Cookie": `${ADMIN_SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0` });
        }
      }

      case "create": {
        // Solo para crear el primer admin (usar con cuidado)
        if (!email || !password) {
          return json({ error: "Email y contraseña requeridos" }, 400);
        }

        const passwordHash = await hashPassword(password);
        const { data, error } = await adminSupabase
          .from("admin_users")
          .insert({ email: email.toLowerCase(), password_hash: passwordHash, name: "Admin" })
          .select("id, email, name")
          .single();

        if (error) {
          if (error.code === "23505") return json({ error: "Email ya registrado" }, 409);
          throw error;
        }

        return json({ user: data }, 201);
      }

      case "change-password": {
        // Requiere cookie de sesión
        const cookie = req.headers.get("Cookie") || "";
        const match = cookie.match(new RegExp(`${ADMIN_SESSION_COOKIE}=([^;]+)`));
        if (!match) return json({ error: "No autenticado" }, 401);

        let userId: string;
        try {
          const user = JSON.parse(atob(match[1]));
          userId = user.id;
        } catch {
          return json({ error: "Sesión inválida" }, 401);
        }

        const { currentPassword, newPassword } = await req.json();
        if (!currentPassword || !newPassword) {
          return json({ error: "Contraseña actual y nueva son requeridas" }, 400);
        }
        if (newPassword.length < 6) {
          return json({ error: "La nueva contraseña debe tener al menos 6 caracteres" }, 400);
        }

        // Obtener hash actual
        const { data: admin, error } = await adminSupabase
          .from("admin_users")
          .select("id, password_hash")
          .eq("id", userId)
          .single();

        if (error || !admin) {
          return json({ error: "Usuario no encontrado" }, 404);
        }

        // Verificar contraseña actual
        const valid = await verifyPassword(currentPassword, admin.password_hash);
        if (!valid) {
          return json({ error: "Contraseña actual incorrecta" }, 401);
        }

        // Hashear nueva contraseña
        const newHash = await hashPassword(newPassword);
        const { error: updError } = await adminSupabase
          .from("admin_users")
          .update({ password_hash: newHash })
          .eq("id", userId);

        if (updError) {
          console.error("Error actualizando password:", updError);
          return json({ error: "Error actualizando contraseña" }, 500);
        }

        // Devolver nueva cookie con misma info (opcional)
        const { data: updatedAdmin } = await adminSupabase
          .from("admin_users")
          .select("id, email, name")
          .eq("id", userId)
          .single();

        const user = { id: updatedAdmin!.id, email: updatedAdmin!.email, name: updatedAdmin!.name };
        return json({ success: true, user }, 200, { "Set-Cookie": `${ADMIN_SESSION_COOKIE}=${btoa(JSON.stringify(user))}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400` });
      }

      default:
        return json({ error: "Acción no válida" }, 400);
    }
  } catch (e) {
    console.error("Admin auth error:", e);
    return json({ error: "Error interno" }, 500);
  }
});

function json(data: unknown, status = 200, extraHeaders: Record<string, string> = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", ...extraHeaders },
  });
}
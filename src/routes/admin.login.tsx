import { createFileRoute, Navigate, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, Lock, Mail, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import {
  adminLogin,
  getAdminSession,
  hasStoredAdminSession,
  verifyAdminSession,
} from "@/lib/admin-auth";
import { StepShell } from "@/components/StepShell";

export const Route = createFileRoute("/admin/login")({
  head: () => ({ meta: [{ title: "Admin Login — ConSentido" }] }),
  component: AdminLogin,
});

function AdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(() => Boolean(getAdminSession()));

  useEffect(() => {
    if (!hasStoredAdminSession()) {
      return;
    }
    let active = true;
    verifyAdminSession().then((user) => {
      if (active && user) {
        setIsAuthenticated(true);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  if (isAuthenticated) {
    return <Navigate to="/admin" />;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const { user, error } = await adminLogin(email, password);
    setLoading(false);

    if (error) {
      toast.error(error);
      return;
    }

    if (user) {
      toast.success(`Bienvenido, ${user.name || user.email}`);
      navigate({ to: "/admin" });
    }
  }

  return (
    <StepShell>
      <div className="min-h-screen flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md glass rounded-3xl p-8 animate-rise">
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-2xl font-semibold tracking-tight">Panel de Administración</h1>
            <p className="mt-2 text-muted-foreground">Inicia sesión para gestionar mensajes</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs uppercase tracking-widest text-muted-foreground mb-1.5">
                Correo electrónico
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/50" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@consentiido.com"
                  className="w-full pl-12 pr-4 py-3 bg-input/60 border border-border rounded-xl text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary transition-colors"
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs uppercase tracking-widest text-muted-foreground mb-1.5">
                Contraseña
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/50" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-12 pr-12 py-3 bg-input/60 border border-border rounded-xl text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary transition-colors"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading} className="w-full btn-base btn-primary py-3">
              {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Iniciar sesión"}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            ¿No tienes cuenta? Contacta al administrador del sistema.
          </p>
        </div>
      </div>
    </StepShell>
  );
}

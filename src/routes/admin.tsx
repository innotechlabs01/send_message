import { createFileRoute, Link, Navigate, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { Plus, Trash2, Edit2, Loader2, Save, X, ChevronLeft, Menu, LogOut, User, Settings, Key } from "lucide-react";
import { toast } from "sonner";
import { adminSupabase } from "@/lib/admin-auth";
import { verifyAdminSession, adminLogout, getAdminSession, changePassword } from "@/lib/admin-auth";
import { StepShell } from "@/components/StepShell";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin — ConSentido" }] }),
  component: AdminLayout,
});

const CATEGORIES = [
  { id: "cumpleanos", label: "Cumpleaños", icon: "🎂" },
  { id: "graduacion", label: "Graduación", icon: "🎓" },
  { id: "aniversario", label: "Aniversario", icon: "💍" },
  { id: "luto", label: "Luto", icon: "🕊️" },
  { id: "amor", label: "Amor", icon: "❤️" },
] as const;

type CategoryId = typeof CATEGORIES[number]["id"];
type Message = { id: string; message_text: string; sort_order: number };

function AdminLayout() {
  const navigate = useNavigate();
  const [user, setUser] = useState<{ id: string; email: string; name: string | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<CategoryId>("cumpleanos");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [modalText, setModalText] = useState("");
  const [saving, setSaving] = useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [cpCurrent, setCpCurrent] = useState("");
  const [cpNew, setCpNew] = useState("");
  const [cpConfirm, setCpConfirm] = useState("");
  const [cpLoading, setCpLoading] = useState(false);

  // Verificar sesión al montar
  useEffect(() => {
    const session = getAdminSession();
    if (!session) {
      navigate({ to: "/admin/login" });
      return;
    }
    setUser(session);
    verifyAdminSession().then((u) => {
      if (!u) navigate({ to: "/admin/login" });
      else setUser(u);
    }).finally(() => setLoading(false));
  }, [navigate]);

  // Cargar mensajes al cambiar categoría
  useEffect(() => {
    if (!activeCategory) return;
    loadMessages();
  }, [activeCategory]);

  async function loadMessages() {
    setLoadingMessages(true);
    try {
      const { data, error } = await adminSupabase
        .from("predefined_messages")
        .select("id, message_text, sort_order")
        .eq("category_id", activeCategory)
        .order("sort_order", { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (e) {
      toast.error("Error cargando mensajes");
      console.error(e);
    } finally {
      setLoadingMessages(false);
    }
  }

  function openAddModal() {
    setEditingMessage(null);
    setModalText("");
    setShowModal(true);
  }

  function openEditModal(msg: Message) {
    setEditingMessage(msg);
    setModalText(msg.message_text);
    setShowModal(true);
  }

  async function saveMessage() {
    if (!modalText.trim()) {
      toast.error("El mensaje no puede estar vacío");
      return;
    }
    setSaving(true);
    try {
      if (editingMessage) {
        // Actualizar
        const { error } = await adminSupabase
          .from("predefined_messages")
          .update({ message_text: modalText.trim() })
          .eq("id", editingMessage.id);
        if (error) throw error;
        toast.success("Mensaje actualizado");
      } else {
        // Obtener el siguiente sort_order
        const maxOrder = messages.length > 0 ? Math.max(...messages.map(m => m.sort_order)) : 0;
        const { error } = await adminSupabase
          .from("predefined_messages")
          .insert({ category_id: activeCategory, message_text: modalText.trim(), sort_order: maxOrder + 1 });
        if (error) throw error;
        toast.success("Mensaje agregado");
      }
      setShowModal(false);
      loadMessages();
    } catch (e) {
      toast.error("Error guardando mensaje");
      console.error(e);
    } finally {
      setSaving(false);
    }
  }

  async function deleteMessage(id: string) {
    if (!confirm("¿Eliminar este mensaje? No se podrá deshacer.")) return;
    try {
      const { error } = await adminSupabase.from("predefined_messages").delete().eq("id", id);
      if (error) throw error;
      toast.success("Mensaje eliminado");
      loadMessages();
    } catch (e) {
      toast.error("Error eliminando mensaje");
      console.error(e);
    }
  }

  async function handleLogout() {
    await adminLogout();
    navigate({ to: "/admin/login" });
  }

  function openChangePasswordModal() {
    setCpCurrent("");
    setCpNew("");
    setCpConfirm("");
    setShowChangePasswordModal(true);
  }

  async function handleChangePassword() {
    if (!cpCurrent || !cpNew || !cpConfirm) {
      toast.error("Completa todos los campos");
      return;
    }
    if (cpNew !== cpConfirm) {
      toast.error("Las contraseñas nuevas no coinciden");
      return;
    }
    if (cpNew.length < 6) {
      toast.error("La nueva contraseña debe tener al menos 6 caracteres");
      return;
    }
    if (cpNew === cpCurrent) {
      toast.error("La nueva contraseña debe ser diferente a la actual");
      return;
    }
    setCpLoading(true);
    try {
      const { user, error } = await changePassword(cpCurrent, cpNew);
      if (error) {
        toast.error(error);
        return;
      }
      if (user) {
        toast.success("Contraseña actualizada correctamente");
        setShowChangePasswordModal(false);
      }
    } catch (e) {
      toast.error("Error cambiando contraseña");
      console.error(e);
    } finally {
      setCpLoading(false);
    }
  }

  if (loading) {
    return (
      <StepShell>
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </StepShell>
    );
  }

  if (!user) return <Navigate to="/admin/login" />;

  return (
    <StepShell>
      <div className="min-h-screen">
        {/* Header */}
        <header className="sticky top-0 z-40 glass/80 border-b border-border/40 backdrop-blur-sm">
          <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link to="/" className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Settings className="w-5 h-5 text-primary" />
                </span>
                <span className="font-semibold text-lg">Admin ConSentido</span>
              </Link>
              <span className="hidden sm:block px-3 py-1 text-xs bg-primary/10 text-primary rounded-full">
                {user.name || user.email}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={openChangePasswordModal} className="btn-base btn-secondary px-3 py-2">
                <Key className="w-4 h-4 mr-2" /> Contraseña
              </button>
              <button onClick={handleLogout} className="btn-base btn-secondary px-3 py-2">
                <LogOut className="w-4 h-4 mr-2" /> Salir
              </button>
            </div>
          </div>

          {/* Category Tabs */}
          <nav className="px-4 pb-3 border-b border-border/40" role="tablist">
            <div className="max-w-6xl mx-auto overflow-x-auto">
              <div className="flex gap-1 min-w-max" role="tablist">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id)}
                    role="tab"
                    aria-selected={activeCategory === cat.id}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors whitespace-nowrap ${
                      activeCategory === cat.id
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:bg-secondary/50"
                    }`}
                  >
                    <span className="text-base">{cat.icon}</span>
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>
          </nav>
        </header>

        {/* Content */}
        <main className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              {(() => {
                const cat = CATEGORIES.find(c => c.id === activeCategory);
                return (
                  <>
                    <h1 className="text-2xl font-semibold">{cat?.label} <span className="text-3xl">{cat?.icon}</span></h1>
                    <p className="text-muted-foreground">Gestiona los mensajes predefinidos para esta categoría</p>
                  </>
                );
              })()}
            </div>
            <button onClick={openAddModal} className="btn-base btn-primary">
              <Plus className="w-4 h-4 mr-2" /> Agregar mensaje
            </button>
          </div>

          {/* Messages List */}
          <div className="glass rounded-2xl border border-border/40 overflow-hidden">
            {loadingMessages ? (
              <div className="p-8 text-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-3" />
                <p className="text-muted-foreground">Cargando mensajes...</p>
              </div>
            ) : messages.length === 0 ? (
              <div className="p-12 text-center">
                <p className="text-muted-foreground mb-4">No hay mensajes en esta categoría</p>
                <button onClick={openAddModal} className="btn-base btn-primary">
                  <Plus className="w-4 h-4 mr-2" /> Crear el primer mensaje
                </button>
              </div>
            ) : (
              <div className="divide-y divide-border/40">
                {messages.map((msg, index) => (
                  <div key={msg.id} className="p-4 flex items-center gap-4 hover:bg-secondary/30 transition-colors">
                    <span className="w-8 text-center text-sm font-medium text-muted-foreground">{msg.sort_order}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-foreground/90 leading-relaxed truncate">{msg.message_text}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => openEditModal(msg)}
                        className="btn-base btn-secondary p-2"
                        title="Editar"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => deleteMessage(msg.id)}
                        className="btn-base btn-secondary p-2 text-red-500 hover:bg-red-500/10"
                        title="Eliminar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="glass rounded-3xl p-6 w-full max-w-2xl animate-rise max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">{editingMessage ? "Editar mensaje" : "Nuevo mensaje"}</h2>
              <button onClick={() => setShowModal(false)} className="btn-base btn-secondary p-2">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <label className="block">
                <span className="text-xs uppercase tracking-widest text-muted-foreground">Mensaje</span>
                <textarea
                  value={modalText}
                  onChange={(e) => setModalText(e.target.value)}
                  placeholder="Escribe el mensaje aquí..."
                  rows={6}
                  className="mt-2 w-full bg-input/60 border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary transition-colors resize-y"
                />
              </label>

              <p className="text-xs text-muted-foreground">
                El mensaje se mostrará tal cual. Máximo 3 frases recomendadas.
              </p>

              <div className="flex justify-end gap-3 pt-4 border-t border-border/40">
                <button onClick={() => setShowModal(false)} className="btn-base btn-secondary">
                  Cancelar
                </button>
                <button onClick={saveMessage} disabled={saving || !modalText.trim()} className="btn-base btn-primary">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                  {editingMessage ? "Guardar cambios" : "Agregar mensaje"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {showChangePasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="glass rounded-3xl p-6 w-full max-w-md animate-rise">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Cambiar contraseña</h2>
              <button onClick={() => setShowChangePasswordModal(false)} className="btn-base btn-secondary p-2">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <label className="block">
                <span className="text-xs uppercase tracking-widest text-muted-foreground">Contraseña actual</span>
                <input
                  type="password"
                  value={cpCurrent}
                  onChange={(e) => setCpCurrent(e.target.value)}
                  placeholder="••••••••"
                  className="mt-2 w-full bg-input/60 border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary transition-colors"
                />
              </label>
              <label className="block">
                <span className="text-xs uppercase tracking-widest text-muted-foreground">Nueva contraseña</span>
                <input
                  type="password"
                  value={cpNew}
                  onChange={(e) => setCpNew(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="mt-2 w-full bg-input/60 border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary transition-colors"
                />
              </label>
              <label className="block">
                <span className="text-xs uppercase tracking-widest text-muted-foreground">Confirmar nueva contraseña</span>
                <input
                  type="password"
                  value={cpConfirm}
                  onChange={(e) => setCpConfirm(e.target.value)}
                  placeholder="••••••••"
                  className="mt-2 w-full bg-input/60 border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary transition-colors"
                />
              </label>

              <div className="flex justify-end gap-3 pt-4 border-t border-border/40">
                <button onClick={() => setShowChangePasswordModal(false)} className="btn-base btn-secondary">
                  Cancelar
                </button>
                <button onClick={handleChangePassword} disabled={cpLoading} className="btn-base btn-primary">
                  {cpLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                  Guardar cambios
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </StepShell>
  );
}
import { createFileRoute, Link, Navigate, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import {
  Plus,
  Trash2,
  Edit2,
  Loader2,
  Save,
  X,
  LogOut,
  Settings,
  Key,
  BarChart3,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  DollarSign,
  Send,
} from "lucide-react";
import { toast } from "sonner";
import {
  verifyAdminSession,
  adminLogout,
  changePassword,
  adminListMessages,
  adminCreateMessage,
  adminUpdateMessage,
  adminDeleteMessage,
  adminFetchKpis,
  adminRetryScheduledMessage,
  type AdminUser,
  type AdminKpiOverview,
} from "@/lib/admin-auth";
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

type CategoryId = (typeof CATEGORIES)[number]["id"];
type ActiveTab = CategoryId | "kpis";
type Message = { id: string; message_text: string; sort_order: number };

function formatCop(amount: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(amount || 0);
}

function AdminLayout() {
  const navigate = useNavigate();
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ActiveTab>("cumpleanos");
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

  const [kpiData, setKpiData] = useState<AdminKpiOverview | null>(null);
  const [loadingKpis, setLoadingKpis] = useState(false);
  const [retryingId, setRetryingId] = useState<string | null>(null);

  // Verificar sesión en servidor al montar (sin confiar en localStorage)
  useEffect(() => {
    let active = true;
    verifyAdminSession()
      .then((u) => {
        if (!active) return;
        if (!u) {
          navigate({ to: "/admin/login" });
        } else {
          setUser(u);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [navigate]);

  const loadMessages = useCallback(async (category: CategoryId) => {
    setLoadingMessages(true);
    try {
      const data = await adminListMessages(category);
      setMessages(data);
    } catch (e) {
      toast.error("Error cargando mensajes");
      console.error(e);
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  const loadKpis = useCallback(async () => {
    setLoadingKpis(true);
    try {
      const overview = await adminFetchKpis(30);
      setKpiData(overview);
    } catch (e) {
      toast.error("Error cargando métricas y KPIs");
      console.error(e);
    } finally {
      setLoadingKpis(false);
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    if (activeTab === "kpis") {
      loadKpis();
    } else {
      loadMessages(activeTab);
    }
  }, [activeTab, user, loadKpis, loadMessages]);

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
    if (activeTab === "kpis") return;
    if (!modalText.trim()) {
      toast.error("El mensaje no puede estar vacío");
      return;
    }
    setSaving(true);
    try {
      if (editingMessage) {
        await adminUpdateMessage(editingMessage.id, modalText.trim());
        toast.success("Mensaje actualizado");
      } else {
        const maxOrder = messages.length > 0 ? Math.max(...messages.map((m) => m.sort_order)) : 0;
        await adminCreateMessage(activeTab, modalText.trim(), maxOrder + 1);
        toast.success("Mensaje agregado");
      }
      setShowModal(false);
      await loadMessages(activeTab);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error guardando mensaje");
      console.error(e);
    } finally {
      setSaving(false);
    }
  }

  async function deleteMessage(id: string) {
    if (activeTab === "kpis") return;
    if (!confirm("¿Eliminar este mensaje? No se podrá deshacer.")) return;
    try {
      await adminDeleteMessage(id);
      toast.success("Mensaje eliminado");
      await loadMessages(activeTab);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error eliminando mensaje");
      console.error(e);
    }
  }

  async function handleRetryMessage(id: string) {
    setRetryingId(id);
    try {
      await adminRetryScheduledMessage(id);
      toast.success("Mensaje reencolado para reintento");
      await loadKpis();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al reintentar mensaje");
      console.error(e);
    } finally {
      setRetryingId(null);
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
    if (cpNew.length < 8) {
      toast.error("La nueva contraseña debe tener al menos 8 caracteres");
      return;
    }
    if (cpNew === cpCurrent) {
      toast.error("La nueva contraseña debe ser diferente a la actual");
      return;
    }
    setCpLoading(true);
    try {
      const { user: updatedUser, error } = await changePassword(cpCurrent, cpNew);
      if (error) {
        toast.error(error);
        return;
      }
      if (updatedUser) {
        setUser(updatedUser);
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
              <button
                onClick={openChangePasswordModal}
                className="btn-base btn-secondary px-3 py-2"
              >
                <Key className="w-4 h-4 mr-2" /> Contraseña
              </button>
              <button onClick={handleLogout} className="btn-base btn-secondary px-3 py-2">
                <LogOut className="w-4 h-4 mr-2" /> Salir
              </button>
            </div>
          </div>

          {/* Category + KPI Tabs */}
          <nav className="px-4 pb-3 border-b border-border/40" role="tablist">
            <div className="max-w-6xl mx-auto overflow-x-auto">
              <div className="flex gap-1 min-w-max" role="tablist">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setActiveTab(cat.id)}
                    role="tab"
                    aria-selected={activeTab === cat.id}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors whitespace-nowrap ${
                      activeTab === cat.id
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:bg-secondary/50"
                    }`}
                  >
                    <span className="text-base">{cat.icon}</span>
                    {cat.label}
                  </button>
                ))}
                <button
                  onClick={() => setActiveTab("kpis")}
                  role="tab"
                  aria-selected={activeTab === "kpis"}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors whitespace-nowrap ${
                    activeTab === "kpis"
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-secondary/50"
                  }`}
                >
                  <BarChart3 className="w-4 h-4" />
                  KPIs & Ops
                </button>
              </div>
            </div>
          </nav>
        </header>

        {/* Content */}
        <main className="max-w-6xl mx-auto px-4 py-6">
          {activeTab === "kpis" ? (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-semibold flex items-center gap-2">
                    KPIs & Operaciones <BarChart3 className="w-6 h-6 text-primary" />
                  </h1>
                  <p className="text-muted-foreground">
                    Monitoreo de embudo de pagos, entregas de WhatsApp y cola de reintentos
                  </p>
                </div>
                <button
                  onClick={loadKpis}
                  disabled={loadingKpis}
                  className="btn-base btn-secondary"
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${loadingKpis ? "animate-spin" : ""}`} />
                  Actualizar
                </button>
              </div>

              {loadingKpis && !kpiData ? (
                <div className="glass rounded-2xl border border-border/40 p-12 text-center">
                  <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-3" />
                  <p className="text-muted-foreground">Cargando métricas operativas...</p>
                </div>
              ) : (
                <>
                  {/* KPI Summary Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="glass rounded-2xl p-5 border border-border/40">
                      <div className="flex items-center justify-between text-muted-foreground text-xs uppercase tracking-wider">
                        <span>Ingresos Confirmados</span>
                        <DollarSign className="w-4 h-4 text-primary" />
                      </div>
                      <p className="text-2xl font-bold mt-2">
                        {formatCop(kpiData?.paymentFunnel.gross_revenue_cop ?? 0)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Ticket prom: {formatCop(kpiData?.paymentFunnel.avg_ticket_cop ?? 0)}
                      </p>
                    </div>

                    <div className="glass rounded-2xl p-5 border border-border/40">
                      <div className="flex items-center justify-between text-muted-foreground text-xs uppercase tracking-wider">
                        <span>Conversión de Pago</span>
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      </div>
                      <p className="text-2xl font-bold mt-2">
                        {kpiData?.paymentFunnel.conversion_rate_pct ?? 0}%
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {kpiData?.paymentFunnel.success_count ?? 0} exitosos de{" "}
                        {kpiData?.paymentFunnel.total_intents ?? 0} intentos
                      </p>
                    </div>

                    <div className="glass rounded-2xl p-5 border border-border/40">
                      <div className="flex items-center justify-between text-muted-foreground text-xs uppercase tracking-wider">
                        <span>Tasa de Entrega WA</span>
                        <Send className="w-4 h-4 text-primary" />
                      </div>
                      <p className="text-2xl font-bold mt-2">
                        {kpiData?.deliveryHealth.delivery_rate_pct ?? 0}%
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {kpiData?.deliveryHealth.sent_messages ?? 0} enviados /{" "}
                        {kpiData?.deliveryHealth.pending_messages ?? 0} en cola
                      </p>
                    </div>

                    <div className="glass rounded-2xl p-5 border border-border/40">
                      <div className="flex items-center justify-between text-muted-foreground text-xs uppercase tracking-wider">
                        <span>Fallidos / Dead-Letter</span>
                        <AlertTriangle className="w-4 h-4 text-amber-500" />
                      </div>
                      <p className="text-2xl font-bold mt-2">
                        {(kpiData?.deliveryHealth.failed_messages ?? 0) +
                          (kpiData?.deliveryHealth.dead_letter_messages ?? 0)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Latencia prom: {kpiData?.deliveryHealth.avg_send_latency_seconds ?? 0}s
                      </p>
                    </div>
                  </div>

                  {/* Failed / Dead-Letter Queue */}
                  <div className="glass rounded-2xl border border-border/40 overflow-hidden">
                    <div className="p-4 border-b border-border/40 flex items-center justify-between">
                      <div>
                        <h2 className="font-semibold text-lg">
                          Cola de Mensajes Fallidos / Dead-Letter
                        </h2>
                        <p className="text-xs text-muted-foreground">
                          Reintenta manualmente mensajes que agotaron intentos o fallaron en Twilio
                        </p>
                      </div>
                      <span className="px-2.5 py-1 text-xs rounded-full bg-amber-500/10 text-amber-600 font-medium">
                        {kpiData?.failedQueue.length ?? 0} pendientes de atención
                      </span>
                    </div>

                    {!kpiData || kpiData.failedQueue.length === 0 ? (
                      <div className="p-8 text-center text-muted-foreground text-sm">
                        No hay mensajes en estado fallido o dead-letter.
                      </div>
                    ) : (
                      <div className="divide-y divide-border/40">
                        {kpiData.failedQueue.map((item) => (
                          <div
                            key={item.id}
                            className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-secondary/20"
                          >
                            <div className="space-y-1 min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-medium text-sm">{item.to_number}</span>
                                <span className="px-2 py-0.5 text-xs rounded-full bg-red-500/10 text-red-500 font-medium">
                                  {item.status} ({item.attempts}/{item.max_attempts})
                                </span>
                                {item.payment_reference_id && (
                                  <span className="text-xs text-muted-foreground">
                                    Ref: {item.payment_reference_id}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-foreground/80 truncate">
                                {item.text || "(Sin texto)"}
                              </p>
                              {item.last_error && (
                                <p className="text-xs text-red-400 truncate">
                                  Error: {item.last_error}
                                </p>
                              )}
                            </div>
                            <button
                              onClick={() => handleRetryMessage(item.id)}
                              disabled={retryingId === item.id}
                              className="btn-base btn-primary px-3 py-2 text-xs shrink-0"
                            >
                              {retryingId === item.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                              ) : (
                                <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                              )}
                              Reintentar envío
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Daily Revenue Table */}
                  <div className="glass rounded-2xl border border-border/40 overflow-hidden">
                    <div className="p-4 border-b border-border/40">
                      <h2 className="font-semibold text-lg">Ingresos Diarios (Últimos 30 días)</h2>
                    </div>
                    {!kpiData || kpiData.dailyRevenue.length === 0 ? (
                      <div className="p-8 text-center text-muted-foreground text-sm">
                        Sin registros de pagos aún.
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                          <thead className="text-xs uppercase text-muted-foreground bg-secondary/30">
                            <tr>
                              <th className="px-4 py-3">Fecha</th>
                              <th className="px-4 py-3">Órdenes</th>
                              <th className="px-4 py-3">Pagadas</th>
                              <th className="px-4 py-3">Fallidas</th>
                              <th className="px-4 py-3">Conversión</th>
                              <th className="px-4 py-3 text-right">Ingresos (COP)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border/40">
                            {kpiData.dailyRevenue.map((row) => (
                              <tr key={row.day} className="hover:bg-secondary/20">
                                <td className="px-4 py-3 font-medium">{row.day}</td>
                                <td className="px-4 py-3">{row.total_orders}</td>
                                <td className="px-4 py-3 text-emerald-600">{row.paid_orders}</td>
                                <td className="px-4 py-3 text-red-500">{row.failed_orders}</td>
                                <td className="px-4 py-3">{row.conversion_rate_pct}%</td>
                                <td className="px-4 py-3 text-right font-semibold">
                                  {formatCop(row.revenue_cop)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-6">
                <div>
                  {(() => {
                    const cat = CATEGORIES.find((c) => c.id === activeTab);
                    return (
                      <>
                        <h1 className="text-2xl font-semibold">
                          {cat?.label} <span className="text-3xl">{cat?.icon}</span>
                        </h1>
                        <p className="text-muted-foreground">
                          Gestiona los mensajes predefinidos para esta categoría
                        </p>
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
                    {messages.map((msg) => (
                      <div
                        key={msg.id}
                        className="p-4 flex items-center gap-4 hover:bg-secondary/30 transition-colors"
                      >
                        <span className="w-8 text-center text-sm font-medium text-muted-foreground">
                          {msg.sort_order}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-foreground/90 leading-relaxed truncate">
                            {msg.message_text}
                          </p>
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
            </>
          )}
        </main>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="glass rounded-3xl p-6 w-full max-w-2xl animate-rise max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">
                {editingMessage ? "Editar mensaje" : "Nuevo mensaje"}
              </h2>
              <button onClick={() => setShowModal(false)} className="btn-base btn-secondary p-2">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <label className="block">
                <span className="text-xs uppercase tracking-widest text-muted-foreground">
                  Mensaje
                </span>
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
                <button
                  onClick={saveMessage}
                  disabled={saving || !modalText.trim()}
                  className="btn-base btn-primary"
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
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
              <button
                onClick={() => setShowChangePasswordModal(false)}
                className="btn-base btn-secondary p-2"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <label className="block">
                <span className="text-xs uppercase tracking-widest text-muted-foreground">
                  Contraseña actual
                </span>
                <input
                  type="password"
                  value={cpCurrent}
                  onChange={(e) => setCpCurrent(e.target.value)}
                  placeholder="••••••••"
                  className="mt-2 w-full bg-input/60 border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary transition-colors"
                />
              </label>
              <label className="block">
                <span className="text-xs uppercase tracking-widest text-muted-foreground">
                  Nueva contraseña
                </span>
                <input
                  type="password"
                  value={cpNew}
                  onChange={(e) => setCpNew(e.target.value)}
                  placeholder="Mínimo 8 caracteres"
                  className="mt-2 w-full bg-input/60 border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary transition-colors"
                />
              </label>
              <label className="block">
                <span className="text-xs uppercase tracking-widest text-muted-foreground">
                  Confirmar nueva contraseña
                </span>
                <input
                  type="password"
                  value={cpConfirm}
                  onChange={(e) => setCpConfirm(e.target.value)}
                  placeholder="••••••••"
                  className="mt-2 w-full bg-input/60 border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary transition-colors"
                />
              </label>

              <div className="flex justify-end gap-3 pt-4 border-t border-border/40">
                <button
                  onClick={() => setShowChangePasswordModal(false)}
                  className="btn-base btn-secondary"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleChangePassword}
                  disabled={cpLoading}
                  className="btn-base btn-primary"
                >
                  {cpLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
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

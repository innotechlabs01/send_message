import { createFileRoute, useNavigate, Navigate } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { RefreshCw, Loader2, Pin, PinOff, Sparkles, Database } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { wizard, useWizard, getCategory } from "@/lib/wizard-store";
import { StepHeader } from "@/components/StepHeader";
import { StepShell } from "@/components/StepShell";

export const Route = createFileRoute("/nuevo/mensaje")({
  head: () => ({ meta: [{ title: "Elige tu mensaje — ConSentido" }] }),
  component: MessageStep,
});

const MAX_PINNED = 2;
const TOTAL_SLOTS = 5;
const PAGE_SIZE = 5;

type MessageSource = "db" | "ai";

function MessageStep() {
  const navigate = useNavigate();
  const state = useWizard();
  const category = getCategory(state.draft.categoryId);
  const [messages, setMessages] = useState<string[]>([]);
  const [pinned, setPinned] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [source, setSource] = useState<MessageSource>("db");
  const [offset, setOffset] = useState(0);
  const [aiSeed, setAiSeed] = useState(0);
  const [hasMoreDb, setHasMoreDb] = useState(true);
  const [lastDbMessages, setLastDbMessages] = useState<string[]>([]);

  // Cargar mensajes (BD o IA)
  const loadMessages = useCallback(async () => {
    if (!category) return;
    setLoading(true);
    try {
      if (source === "db") {
        // Cargar desde BD
        const { data, error } = await supabase.functions.invoke("get-predefined-messages", {
          body: { category: category.id, offset, limit: PAGE_SIZE },
        });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);

        const newMessages = data?.messages ?? [];
        const hasMore = data?.hasMore ?? false;

        // Agregar mensajes nuevos a los existentes (no reemplazar si hay anclados)
        setMessages((prev) => {
          const combined = [...prev, ...newMessages];
          // Eliminar duplicados manteniendo orden
          return Array.from(new Set(combined));
        });
        setHasMoreDb(hasMore);
        setOffset((prev) => prev + PAGE_SIZE);

        // Guardar últimos mensajes de BD para few-shot en IA
        if (newMessages.length > 0) {
          setLastDbMessages(newMessages);
        }

        // Si no hay más en BD, cambiar a IA
        if (!hasMore) {
          setSource("ai");
          setAiSeed(0);
          toast.info("Generando nuevos mensajes con IA...", { duration: 2000 });
        }
      } else {
        // Generar con IA (usando últimos mensajes BD como ejemplos)
        const { data, error } = await supabase.functions.invoke("generate-message", {
          body: {
            category: category.label,
            seed: aiSeed,
            examples: lastDbMessages.length > 0 ? lastDbMessages.slice(-5) : undefined,
          },
        });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);

        const newMessages = data?.messages ?? [];
        setMessages((prev) => {
          const combined = [...prev, ...newMessages];
          return Array.from(new Set(combined));
        });
        setAiSeed((prev) => prev + 1);
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "No fue posible cargar los mensajes";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [category, source, offset, aiSeed, lastDbMessages]);

  // Carga inicial
  useEffect(() => {
    if (category) loadMessages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category?.id]);

  if (!state.hydrated) return <StepShell withFooter />;
  if (!category) return <Navigate to="/nuevo/categoria" />;

  function pick(m: string) {
    wizard.setDraft({ message: m });
    navigate({ to: "/nuevo/confirmar" });
  }

  function togglePin(m: string) {
    setPinned((prev) => {
      if (prev.includes(m)) return prev.filter((x) => x !== m);
      if (prev.length >= MAX_PINNED) {
        toast.error(`Solo puedes anclar hasta ${MAX_PINNED} mensajes`);
        return prev;
      }
      return [...prev, m];
    });
  }

  function handleRefresh() {
    loadMessages();
  }

  // Filtrar mensajes: anclados + frescos (hasta TOTAL_SLOTS)
  const freshMessages = messages
    .filter((m) => !pinned.includes(m))
    .slice(0, TOTAL_SLOTS - pinned.length);
  const showDbBadge = source === "db" && messages.length > 0;
  const showAiBadge = source === "ai";

  return (
    <StepShell withFooter>
      <StepHeader
        step={2}
        total={4}
        title={`Mensajes para ${category.label.toLowerCase()}`}
        subtitle="Elige el que más resuene. Ancla los que te gusten para compararlos con los nuevos."
        backTo="/nuevo/categoria"
      />

      {/* Indicador de fuente */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {showDbBadge && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
              <Database className="w-3 h-3" />
              Mensajes originales
            </span>
          )}
          {showAiBadge && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
              <Sparkles className="w-3 h-3" />
              Generados por IA
            </span>
          )}
        </div>
        {source === "db" && offset > 0 && (
          <span className="text-xs text-muted-foreground">
            Mostrando {Math.min(offset, messages.length)} de {messages.length} mensajes
          </span>
        )}
      </div>

      {pinned.length > 0 && (
        <section className="mb-6">
          <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground mb-3">
            <Pin className="w-3.5 h-3.5" /> Anclados ({pinned.length}/{MAX_PINNED})
          </div>
          <div className="space-y-3">
            {pinned.map((m, i) => (
              <MessageItem
                key={`p-${i}`}
                index={i + 1}
                message={m}
                pinned
                onPick={() => pick(m)}
                onTogglePin={() => togglePin(m)}
              />
            ))}
          </div>
          <div className="my-6 border-t border-border/60" />
        </section>
      )}

      <div className="space-y-3">
        {loading && freshMessages.length === 0
          ? Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="glass rounded-2xl p-5 h-24 relative overflow-hidden">
                <div className="absolute inset-0 animate-shimmer" />
              </div>
            ))
          : freshMessages.map((m, i) => (
              <MessageItem
                key={`${source}-${offset}-${i}`}
                index={i + 1 + pinned.length}
                message={m}
                onPick={() => pick(m)}
                onTogglePin={() => togglePin(m)}
                delay={i * 60}
              />
            ))}
      </div>

      <div className="fixed bottom-0 inset-x-0 z-40 bg-card border-t border-border/60 shadow-[0_-8px_24px_-12px_rgba(0,0,0,0.08)]">
        <div className="max-w-5xl mx-auto px-6 py-4 flex flex-wrap items-center justify-between gap-3">
          <p className="hidden sm:block text-sm text-muted-foreground">
            ¿Quieres más opciones? Refresca y compara con tus anclados.
          </p>
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="btn-base btn-secondary w-full sm:w-auto"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            Refrescar
          </button>
        </div>
      </div>
    </StepShell>
  );
}

function MessageItem({
  index,
  message,
  pinned = false,
  onPick,
  onTogglePin,
  delay = 0,
}: {
  index: number;
  message: string;
  pinned?: boolean;
  onPick: () => void;
  onTogglePin: () => void;
  delay?: number;
}) {
  return (
    <div
      className="glass step-card rounded-2xl p-5 flex items-start gap-4 animate-rise group"
      style={{ animationDelay: `${delay}ms` }}
    >
      <span className="shrink-0 w-8 h-8 rounded-full icon-duotone grid place-items-center text-sm font-medium tabular-nums">
        {index}
      </span>
      <button onClick={onPick} className="flex-1 text-left leading-relaxed text-foreground/95">
        {message}
      </button>
      <button
        onClick={onTogglePin}
        aria-label={pinned ? "Desanclar" : "Anclar"}
        className={`shrink-0 w-9 h-9 rounded-full grid place-items-center border transition-colors ${
          pinned
            ? "bg-primary text-primary-foreground border-transparent"
            : "bg-card text-muted-foreground border-border hover:text-foreground hover:border-primary/40"
        }`}
      >
        {pinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
      </button>
    </div>
  );
}

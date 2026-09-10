import { createFileRoute, useNavigate, Navigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { RefreshCw, Loader2, Pin, PinOff } from "lucide-react";
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

function MessageStep() {
  const navigate = useNavigate();
  const state = useWizard();
  const category = getCategory(state.draft.categoryId);
  const [messages, setMessages] = useState<string[]>([]);
  const [pinned, setPinned] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [seed, setSeed] = useState(0);

  async function load(nextSeed: number) {
    if (!category) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-messages", {
        body: { category: category.label, seed: nextSeed },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setMessages(data?.messages ?? []);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "No fue posible generar los mensajes";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (category) load(0);
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

  function regenerate() {
    const next = seed + 1;
    setSeed(next);
    load(next);
  }

  const freshMessages = messages.filter((m) => !pinned.includes(m)).slice(0, TOTAL_SLOTS - pinned.length);

  return (
    <StepShell withFooter>
      <StepHeader
        step={2}
        total={4}
        title={`Mensajes para ${category.label.toLowerCase()}`}
        subtitle="Elige el que más resuene. Ancla los que te gusten para compararlos con los nuevos."
        backTo="/nuevo/categoria"
      />

      {pinned.length > 0 && (
        <section className="mb-6">
          <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground mb-3">
            <Pin className="w-3.5 h-3.5" /> Anclados ({pinned.length}/{MAX_PINNED})
          </div>
          <div className="space-y-3">
            {pinned.map((m, i) => (
              <MessageItem key={`p-${i}`} index={i + 1} message={m} pinned onPick={() => pick(m)} onTogglePin={() => togglePin(m)} />
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
                key={`${seed}-${i}`}
                index={i + 1}
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
          <button onClick={regenerate} disabled={loading} className="btn-base btn-secondary w-full sm:w-auto">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Refrescar
          </button>
        </div>
      </div>
    </StepShell>
  );
}

function MessageItem({
  index, message, pinned = false, onPick, onTogglePin, delay = 0,
}: {
  index: number; message: string; pinned?: boolean;
  onPick: () => void; onTogglePin: () => void; delay?: number;
}) {
  return (
    <div className="glass step-card rounded-2xl p-5 flex items-start gap-4 animate-rise group" style={{ animationDelay: `${delay}ms` }}>
      <span className="shrink-0 w-8 h-8 rounded-full icon-duotone grid place-items-center text-sm font-medium tabular-nums">{index}</span>
      <button onClick={onPick} className="flex-1 text-left leading-relaxed text-foreground/95">{message}</button>
      <button
        onClick={onTogglePin}
        aria-label={pinned ? "Desanclar" : "Anclar"}
        className={`shrink-0 w-9 h-9 rounded-full grid place-items-center border transition-colors ${
          pinned ? "bg-primary text-primary-foreground border-transparent"
                 : "bg-card text-muted-foreground border-border hover:text-foreground hover:border-primary/40"
        }`}
      >
        {pinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
      </button>
    </div>
  );
}

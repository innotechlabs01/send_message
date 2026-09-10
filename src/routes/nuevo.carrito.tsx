import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import * as LucideIcons from "lucide-react";
import { ArrowRight, CalendarDays, CreditCard, Image as ImageIcon, Pencil, Sparkles, Trash2, User } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import { getCategory, PRICE_PER_MESSAGE, useWizard, wizard, type CartItem } from "@/lib/wizard-store";
import { StepHeader } from "@/components/StepHeader";
import { StepShell, StepFooter } from "@/components/StepShell";
import { NewMessageDialog } from "@/components/NewMessageDialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/nuevo/carrito")({
  validateSearch: (search: Record<string, unknown>): { nuevo?: "1" } =>
    search.nuevo === "1" ? { nuevo: "1" } : {},
  head: () => ({ meta: [{ title: "Tu carrito — ConSentido" }] }),
  component: CartStep,
});

function CartStep() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const state = useWizard();
  const [dialogOpen, setDialogOpen] = useState(search.nuevo === "1");
  const [editing, setEditing] = useState<CartItem | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<CartItem | null>(null);

  if (!state.hydrated) return <StepShell withFooter />;

  const items = state.items;
  const total = items.length * PRICE_PER_MESSAGE;

  function startNew() {
    setEditing(null);
    setDialogOpen(true);
  }
  function startEdit(item: CartItem) {
    setEditing(item);
    setDialogOpen(true);
  }
  function tryDelete(item: CartItem) {
    if (items.length <= 1) {
      setConfirmDelete(item);
    } else {
      wizard.removeItem(item.id);
      toast.success("Mensaje eliminado");
    }
  }
  function confirmedDelete() {
    if (!confirmDelete) return;
    wizard.removeItem(confirmDelete.id);
    setConfirmDelete(null);
    toast.success("Mensaje eliminado");
    navigate({ to: "/" });
  }

  return (
    <StepShell withFooter>
      <StepHeader
        step={4}
        total={4}
        title={items.length > 0 ? `${items.length} mensaje${items.length > 1 ? "s" : ""} programado${items.length > 1 ? "s" : ""}` : "Tu carrito está vacío"}
        subtitle="Revisa, edita o agrega más mensajes antes de pagar."
        backTo="/nuevo/confirmar"
      />

      {items.length === 0 ? (
        <div className="glass rounded-3xl p-10 text-center animate-rise">
          <p className="text-muted-foreground mb-6">Aún no has agregado mensajes al carrito.</p>
          <button onClick={startNew} className="btn-base btn-primary">
            <Sparkles className="w-4 h-4" /> Crear primer mensaje
          </button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {items.map((it, i) => (
            <CartCard key={it.id} item={it} delay={i * 60} onEdit={() => startEdit(it)} onDelete={() => tryDelete(it)} />
          ))}
        </div>
      )}

      <StepFooter>
        <button onClick={startNew} className="btn-base btn-secondary w-full sm:w-auto">
          <Sparkles className="w-4 h-4" /> Generar otro mensaje
        </button>
        <button
          onClick={() => navigate({ to: "/nuevo/pago" })}
          disabled={items.length === 0}
          className="group btn-base btn-primary w-full sm:w-auto"
        >
          <CreditCard className="w-4 h-4" />
          Pagar {items.length > 0 ? `· $${total.toLocaleString("es-CO")} COP` : ""}
          <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
        </button>
      </StepFooter>

      <NewMessageDialog open={dialogOpen} onOpenChange={setDialogOpen} editingItem={editing} />

      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar este mensaje?</AlertDialogTitle>
            <AlertDialogDescription>
              Es el último mensaje del carrito. Si lo eliminas, <strong>no podrás recuperar el mensaje ni los datos ingresados</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Conservar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmedDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Sí, eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </StepShell>
  );
}

function CartCard({ item, delay = 0, onEdit, onDelete }: { item: CartItem; delay?: number; onEdit: () => void; onDelete: () => void }) {
  const category = getCategory(item.categoryId);
  if (!category) return null;
  const Icon = (LucideIcons as unknown as Record<string, LucideIcons.LucideIcon>)[category.icon];

  return (
    <div className={`cat-${category.accent} glass rounded-3xl p-5 animate-rise flex flex-col`} style={{ animationDelay: `${delay}ms` }}>
      <div className="aspect-[16/9] bg-muted rounded-2xl border border-border/60 grid place-items-center text-muted-foreground mb-4 relative overflow-hidden">
        <div className="flex flex-col items-center gap-1.5 text-xs">
          <ImageIcon className="w-5 h-5 opacity-60" />
          <span>Imagen de {category.label.toLowerCase()}</span>
        </div>
        <div className="absolute top-3 left-3 flex items-center gap-2 bg-card/90 backdrop-blur rounded-full pl-1 pr-3 py-1 border border-border/60">
          <span data-cat className="w-6 h-6 rounded-full icon-duotone grid place-items-center">
            {Icon ? <Icon className="w-3.5 h-3.5" /> : null}
          </span>
          <span className="text-xs font-medium">{category.label}</span>
        </div>
      </div>

      <div className="space-y-2 text-sm flex-1">
        <div className="flex items-center gap-2 text-muted-foreground">
          <User className="w-3.5 h-3.5" />
          <span>Para <span className="text-foreground font-medium">{item.recipient || "—"}</span></span>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <CalendarDays className="w-3.5 h-3.5" />
          <span>{format(new Date(item.sendDate + "T00:00:00"), "EEEE d 'de' MMMM, yyyy", { locale: es })}</span>
        </div>
        <p className="text-foreground/85 leading-relaxed line-clamp-3 pt-1">{item.message}</p>
      </div>

      <div className="flex gap-2 mt-4 pt-4 border-t border-border/50">
        <button onClick={onEdit} className="flex-1 inline-flex items-center justify-center gap-1.5 h-9 rounded-full text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors">
          <Pencil className="w-3.5 h-3.5" /> Editar
        </button>
        <button onClick={onDelete} className="flex-1 inline-flex items-center justify-center gap-1.5 h-9 rounded-full text-sm text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
          <Trash2 className="w-3.5 h-3.5" /> Eliminar
        </button>
      </div>
    </div>
  );
}

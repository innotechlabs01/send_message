import { createFileRoute, useNavigate } from "@tanstack/react-router";
import * as LucideIcons from "lucide-react";
import { ArrowRight } from "lucide-react";
import { CATEGORIES, wizard, useWizard } from "@/lib/wizard-store";
import { StepHeader } from "@/components/StepHeader";
import { StepShell } from "@/components/StepShell";

export const Route = createFileRoute("/nuevo/categoria")({
  head: () => ({ meta: [{ title: "Elige la ocasión — ConSentido" }] }),
  component: CategoryStep,
});

function CategoryStep() {
  const navigate = useNavigate();
  const state = useWizard();

  function select(id: string) {
    wizard.setDraft({ categoryId: id, message: null });
    navigate({ to: "/nuevo/mensaje" });
  }

  return (
    <StepShell>
      <StepHeader
        step={1}
        total={4}
        title="¿Cuál es la ocasión?"
        subtitle="Elige una categoría para empezar a darle forma a tu mensaje."
        backTo="/"
        backLabel="Inicio"
      />

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {CATEGORIES.map((cat, i) => {
          const Icon = (LucideIcons as unknown as Record<string, LucideIcons.LucideIcon>)[cat.icon];
          const selected = state.draft.categoryId === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => select(cat.id)}
              className={`cat-${cat.accent} glass step-card rounded-3xl p-6 text-left animate-rise group cursor-pointer relative overflow-hidden ${
                selected ? "!border-primary/40" : ""
              }`}
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <div className="flex items-start justify-between mb-4">
                <div data-cat className="w-12 h-12 rounded-2xl icon-duotone grid place-items-center transition-transform group-hover:scale-110">
                  {Icon ? <Icon className="w-6 h-6" /> : null}
                </div>
                <div className="w-8 h-8 rounded-full bg-primary/10 text-primary grid place-items-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>
              <h3 className="text-lg font-semibold">{cat.label}</h3>
              <p className="text-sm text-muted-foreground mt-1">{cat.description}</p>
            </button>
          );
        })}
      </div>
    </StepShell>
  );
}

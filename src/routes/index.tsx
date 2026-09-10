import { createFileRoute, Link } from "@tanstack/react-router";
import { Sparkles, Wand2, Send, ShieldCheck, ArrowRight } from "lucide-react";
import { BrandMark } from "@/components/BrandMark";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ConSentido — Mensajes especiales para fechas especiales" },
      { name: "description", content: "Crea mensajes únicos generados con IA para cumpleaños, aniversarios, graduaciones y más. Envíalos con intención." },
      { property: "og:title", content: "ConSentido — Mensajes especiales" },
      { property: "og:description", content: "Mensajes únicos con IA para las fechas que importan." },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen">
      <nav className="max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
        <BrandMark />
        <Link
          to="/nuevo/categoria"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Crear mensaje
        </Link>
      </nav>

      <main className="max-w-6xl mx-auto px-6 pt-16 pb-24">
        <section className="text-center max-w-3xl mx-auto animate-rise">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass text-xs text-muted-foreground mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            Mensajes únicos generados con IA
          </div>
          <h1 className="text-5xl md:text-7xl font-semibold tracking-tight leading-[1.05]">
            Las palabras justas
            <br />
            <span className="text-gradient">para los momentos que importan.</span>
          </h1>
          <p className="mt-6 text-lg text-muted-foreground max-w-xl mx-auto">
            Cumpleaños, aniversarios, graduaciones. Crea un mensaje pensado a tu medida en menos de un minuto.
          </p>

          <div className="mt-10 flex items-center justify-center gap-3">
            <Link
              to="/nuevo/categoria"
              className="group btn-base btn-primary"
            >
              Crear nuevo mensaje
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        </section>

        <section className="mt-28">
          <div className="text-center mb-10">
            <div className="text-xs uppercase tracking-widest text-muted-foreground mb-2">
              ¿Cómo funciona?
            </div>
            <h2 className="text-2xl md:text-3xl font-semibold tracking-tight">
              Tres pasos para enviar un mensaje con sentido
            </h2>
          </div>
          <div className="grid md:grid-cols-3 md:divide-x divide-border/60">
            {[
              { icon: Wand2, title: "Elige la ocasión", body: "Seis categorías para empezar: cumpleaños, boda, graduación y más." },
              { icon: Sparkles, title: "5 mensajes con IA", body: "Sugerencias originales. ¿No te gustan? Refresca y obtén otros cinco." },
              { icon: Send, title: "Envía con intención", body: "Confirma destinatario, remitente y números. Listo para enviar." },
            ].map((f, i) => (
              <div
                key={f.title}
                className="px-6 py-4 md:px-10 animate-rise"
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <div className="w-10 h-10 rounded-xl bg-muted grid place-items-center mb-4 text-muted-foreground">
                  <f.icon className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-semibold mb-1.5">{f.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{f.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-20 glass rounded-3xl p-10 md:p-14 text-center relative overflow-hidden">
          <div className="absolute inset-0 animate-shimmer pointer-events-none" />
          <ShieldCheck className="w-8 h-8 text-primary mx-auto mb-4 animate-float" />
          <h2 className="text-3xl md:text-4xl font-semibold tracking-tight">
            Cada paso, en tus manos.
          </h2>
          <p className="mt-3 text-muted-foreground max-w-xl mx-auto">
            Vuelve atrás, deshaz una elección o empieza de nuevo cuando quieras. El proceso se siente liviano y bajo control.
          </p>
          <Link
            to="/nuevo/categoria"
            className="mt-8 btn-base btn-secondary"
          >
            Empezar ahora
            <ArrowRight className="w-4 h-4" />
          </Link>
        </section>
      </main>

      <footer className="border-t border-border/50 py-8 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} ConSentido — palabras con intención
      </footer>
    </div>
  );
}

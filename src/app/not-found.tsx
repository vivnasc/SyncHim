import Link from 'next/link';
import { EstrelaPersa } from '@/components/marks/EstrelaPersa';
import { Vesica } from '@/components/marks/Vesica';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 md:px-10 py-24 text-center">
      <Vesica className="w-20 h-12 text-gold mb-10" />
      <div className="mini-caps text-bordeaux mb-4">404</div>
      <h1 className="font-serif text-5xl md:text-6xl text-bone mb-6 leading-tight max-w-2xl">
        Esta página não existe, ou já não existe.
      </h1>
      <p className="font-body italic text-bone/80 text-lg max-w-prose mb-10 leading-relaxed">
        Se chegaste aqui por engano, podes voltar ao início. Se o link veio de um email antigo,
        provavelmente já cumpriu o que tinha para cumprir.
      </p>
      <div className="flex flex-col sm:flex-row gap-4 items-center">
        <Link href="/" className="cta-living">
          <span>Voltar ao início</span>
          <span className="arrow" aria-hidden="true">→</span>
        </Link>
        <Link href="/pt/diagnostico" className="text-ash hover:text-goldBright text-sm tracking-wide transition-colors">
          Começar o diagnóstico
        </Link>
      </div>
      <EstrelaPersa className="w-12 h-12 text-goldBright mt-16" />
    </div>
  );
}

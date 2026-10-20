/**
 * Logotipo de CrediGest — reproduce el ícono (edificio bancario con un
 * sello de verificación) y el wordmark en dos tonos del prototipo de
 * Figma: "Credi" en navy, "Gest" en verde. Es un componente único para
 * que la marca sea consistente en toda la app (splash, encabezados,
 * favicon) en vez de repetir SVG a mano en cada pantalla.
 */
export default function Logo({ tamano = "md", conTexto = true }: { tamano?: "sm" | "md" | "lg"; conTexto?: boolean }) {
  const dimension = { sm: 32, md: 48, lg: 72 }[tamano];
  const textoClase = { sm: "text-base", md: "text-xl", lg: "text-3xl" }[tamano];

  return (
    <div className="flex flex-col items-center gap-2">
      <svg width={dimension} height={dimension} viewBox="0 0 64 64" fill="none" aria-hidden="true">
        <rect x="6" y="26" width="52" height="30" rx="3" fill="#15304D" />
        <path d="M32 6 L58 22 H6 Z" fill="#15304D" />
        <rect x="14" y="32" width="6" height="18" fill="#FFFFFF" />
        <rect x="26" y="32" width="6" height="18" fill="#FFFFFF" />
        <rect x="38" y="32" width="6" height="18" fill="#FFFFFF" />
        <rect x="50" y="32" width="6" height="18" fill="#FFFFFF" />
        <circle cx="48" cy="46" r="15" fill="#2E9E5B" stroke="#FFFFFF" strokeWidth="2.5" />
        <path d="M41 46.5 L46 51.5 L56 40.5" stroke="#FFFFFF" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </svg>
      {conTexto && (
        <p className={`font-display font-bold leading-none ${textoClase}`}>
          <span className="text-navy">Credi</span>
          <span className="text-verde">Gest</span>
        </p>
      )}
    </div>
  );
}

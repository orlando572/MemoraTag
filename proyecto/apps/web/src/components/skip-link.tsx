// Visible only on keyboard focus; first focusable element of the page.
export function SkipLink() {
  return (
    <a
      href="#contenido"
      className="sr-only rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[70]"
    >
      Saltar al contenido
    </a>
  );
}

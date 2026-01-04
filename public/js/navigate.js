/**
 * Navegación programática compatible con Astro View Transitions.
 * Crea un link invisible y lo clickea, lo que Astro intercepta
 * automáticamente para usar View Transitions.
 */
export function navigateTo(url) {
  const a = document.createElement('a');
  a.href = url;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

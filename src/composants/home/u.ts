// Unité de la maquette Figma (393px de large) convertie en unité responsive :
// `--u` est définie sur le conteneur de l'accueil (largeur de la scène / 393),
// donc u(40) = "40px de la maquette" quelle que soit la taille de l'écran.
export function u(n: number): string {
  return `calc(var(--u) * ${n})`;
}

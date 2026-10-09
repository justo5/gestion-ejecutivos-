// Tono (0–359) estable para cada carpeta del tablero de tareas, así su avatar
// y la etiqueta de sus tareas tienen siempre el mismo color.
export function folderHue(id: string): number {
  // FNV-1a, y el ángulo áureo para que ids parecidos queden bien separados.
  let hash = 0x811c9dc5;
  for (const char of id) hash = Math.imul(hash ^ char.charCodeAt(0), 0x01000193);
  return Math.floor(((hash >>> 0) * 137.508) % 360);
}

export function folderColor(id: string): string {
  return `hsl(${folderHue(id)} 65% 62%)`;
}

// Primera letra del nombre, para el avatar.
export function folderInitial(name: string): string {
  return name.trim().charAt(0).toUpperCase() || '?';
}

// Nombre "público" de un cliente: en toda la app se prioriza el nombre de su
// fanpage (así lo reconoce el equipo puertas afuera) sobre el nombre real del
// cliente. Si no hay fanpage cargada, se cae al nombre del cliente.
export interface ClientLike {
  name: string;
  fanpage?: string | null;
  data?: Record<string, unknown> | null;
}

export function clientDisplayName(client: ClientLike | null | undefined): string {
  if (!client) return '';
  if (client.fanpage && client.fanpage.trim()) return client.fanpage.trim();

  // Fallback: la fanpage puede venir solo en las columnas crudas importadas
  // (import de Excel) en vez del campo tipado.
  const entry = Object.entries(client.data ?? {}).find(([label]) => /fan\s*page/i.test(label));
  const fromData = entry ? String(entry[1] ?? '').trim() : '';
  if (fromData) return fromData;

  return client.name;
}

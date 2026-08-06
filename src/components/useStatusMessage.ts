import { useCallback, useState } from 'react';
import type { StatusBannerVariant } from './StatusBanner';

export interface StatusMessageState {
  variant: StatusBannerVariant;
  message: string;
}

/**
 * Estado padronizado para a StatusBanner de uma página - usa isto em vez de inventar um
 * `saveMessage`/`createError`/`publishMessage` próprio por página. Um só destes por página é
 * o suficiente na maior parte dos casos; para páginas com várias secções independentes
 * (ex: a Flows, com "guardar" e "publicar" separados), usa uma instância por secção.
 */
export function useStatusMessage() {
  const [status, setStatus] = useState<StatusMessageState | null>(null);

  const showSuccess = useCallback((message: string) => setStatus({ variant: 'success', message }), []);
  const showWarning = useCallback((message: string) => setStatus({ variant: 'warning', message }), []);
  const showError = useCallback((message: string) => setStatus({ variant: 'error', message }), []);
  const showInfo = useCallback((message: string) => setStatus({ variant: 'info', message }), []);
  const clear = useCallback(() => setStatus(null), []);

  return { status, showSuccess, showWarning, showError, showInfo, clear };
}

import type { ReactNode } from 'react';
import './StatusBanner.css';

export type StatusBannerVariant = 'success' | 'warning' | 'error' | 'info';

interface StatusBannerProps {
  /** 'success' = verde, 'warning' = amarelo, 'error' = vermelho, 'info' = azul (mensagens vindas da Meta). */
  variant: StatusBannerVariant;
  message: ReactNode;
  onDismiss?: () => void;
}

const ICONS: Record<StatusBannerVariant, string> = {
  success: '✓',
  warning: '⚠',
  error: '✕',
  info: 'ⓘ',
};

/**
 * Faixa de estado padronizada, para usar em todas as páginas do Portal depois de uma ação
 * (guardar, publicar, eliminar, etc.). Substitui as mensagens "à mão" que cada página
 * construía por conta própria - e é precisamente essa falta de padrão que causava
 * inconsistências como uma mensagem de erro a sair com a cor de sucesso.
 *
 * variant "info" (azul) é especificamente para mensagens cujo conteúdo vem da Meta (ex:
 * avisos de validação de um Flow) - distinto de "warning" (os nossos próprios avisos) para
 * ficar claro visualmente que aquele texto não foi escrito por nós.
 */
export function StatusBanner({ variant, message, onDismiss }: StatusBannerProps) {
  if (!message) return null;

  return (
    <div className={`status-banner status-banner--${variant}`} role={variant === 'error' ? 'alert' : 'status'}>
      <span className="status-banner__icon" aria-hidden="true">
        {ICONS[variant]}
      </span>
      <span className="status-banner__message">{message}</span>
      {onDismiss && (
        <button type="button" className="status-banner__dismiss" onClick={onDismiss} aria-label="Fechar">
          ×
        </button>
      )}
    </div>
  );
}

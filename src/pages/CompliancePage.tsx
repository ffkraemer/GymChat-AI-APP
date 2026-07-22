import { useEffect, useState } from 'react';
import { useAuth } from '../auth/useAuth';
import {
  getComplianceFailures,
  getComplianceSnapshot,
  type ComplianceSnapshot,
  type FailuresSnapshot,
} from '../api/compliance';
import './CompliancePage.css';

const QUALITY_LABELS: Record<string, string> = {
  GREEN: 'Saudável',
  YELLOW: 'Atenção',
  RED: 'Risco elevado',
  UNKNOWN: 'Ainda sem dados',
  NA: 'Não aplicável',
};

function qualityClass(rating: string): string {
  switch (rating) {
    case 'GREEN':
      return 'compliance__quality--green';
    case 'YELLOW':
      return 'compliance__quality--yellow';
    case 'RED':
      return 'compliance__quality--red';
    default:
      return 'compliance__quality--unknown';
  }
}

function formatDateTime(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('pt-PT', { dateStyle: 'short', timeStyle: 'short' });
}

export function CompliancePage() {
  const { user } = useAuth();
  const [snapshot, setSnapshot] = useState<ComplianceSnapshot | null>(null);
  const [failures, setFailures] = useState<FailuresSnapshot | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  function load() {
    if (!user) return;
    setIsLoading(true);
    setLoadError(null);

    Promise.all([getComplianceSnapshot(user.gymId), getComplianceFailures(user.gymId)])
      .then(([snapshotResult, failuresResult]) => {
        setSnapshot(snapshotResult);
        setFailures(failuresResult);
      })
      .catch(() => setLoadError('Não foi possível carregar os dados de conformidade.'))
      .finally(() => setIsLoading(false));
  }

  useEffect(load, [user]);

  return (
    <div className="compliance">
      <header className="compliance__header">
        <div>
          <h1>Conformidade</h1>
          <p>
            Indicadores de risco de bloqueio pela Meta, com base nas regras de qualidade e
            limites de mensagens da WhatsApp Business Platform.
          </p>
        </div>
        <button type="button" className="compliance__refresh" onClick={load} disabled={isLoading}>
          {isLoading ? 'A atualizar…' : 'Atualizar'}
        </button>
      </header>

      {loadError && <p className="compliance__error">{loadError}</p>}
      {isLoading && !snapshot && <p className="compliance__empty">A carregar…</p>}

      {snapshot && (
        <>
          <section className="compliance__stats">
            <div className={`compliance__card compliance__quality ${qualityClass(snapshot.qualityRating)}`}>
              <span className="compliance__card-label">Quality Rating</span>
              <span className="compliance__card-value">{QUALITY_LABELS[snapshot.qualityRating] ?? snapshot.qualityRating}</span>
              <span className="compliance__card-sub">{snapshot.qualityRating}</span>
            </div>

            <div className="compliance__card">
              <span className="compliance__card-label">Limite de mensagens</span>
              <span className="compliance__card-value">{snapshot.messagingLimit ?? '—'}</span>
              <span className="compliance__card-sub">Partilhado por todo o Business Portfolio desde out. 2025</span>
            </div>

            <div className="compliance__card">
              <span className="compliance__card-label">Erros (24h)</span>
              <span className="compliance__card-value">{snapshot.errorCountLast24h}</span>
            </div>

            <div className="compliance__card">
              <span className="compliance__card-label">Erros (7 dias)</span>
              <span className="compliance__card-value">{snapshot.errorCountLast7d}</span>
            </div>
          </section>

          {snapshot.riskFlags.length > 0 && (
            <section className="compliance__section">
              <h2>Avisos</h2>
              <div className="compliance__flags">
                {snapshot.riskFlags.map((flag, index) => (
                  <div key={index} className="compliance__flag">
                    {flag}
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="compliance__section">
            <h2>Códigos de erro mais frequentes (últimos 7 dias)</h2>
            {snapshot.topErrorCodes.length === 0 ? (
              <p className="compliance__empty">Sem erros registados nos últimos 7 dias. 🎉</p>
            ) : (
              <table className="compliance__table">
                <thead>
                  <tr>
                    <th>Código</th>
                    <th>Ocorrências</th>
                  </tr>
                </thead>
                <tbody>
                  {snapshot.topErrorCodes.map((row) => (
                    <tr key={row.errorCode ?? 'sem-codigo'}>
                      <td>{row.errorCode ?? 'Sem código'}</td>
                      <td>{row.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </>
      )}

      {failures && (
        <>
          <section className="compliance__section">
            <h2>Falhas registadas na Meta</h2>
            <p className="compliance__section-sub">
              Entregas que a Meta aceitou mas depois reportou como falhadas (via webhook de estado) - últimos 7 dias.
            </p>
            {failures.metaDeliveryFailures.length === 0 ? (
              <p className="compliance__empty">Sem falhas de entrega reportadas pela Meta. 🎉</p>
            ) : (
              <table className="compliance__table">
                <thead>
                  <tr>
                    <th>Destinatário</th>
                    <th>Código</th>
                    <th>Mensagem</th>
                    <th>Quando</th>
                  </tr>
                </thead>
                <tbody>
                  {failures.metaDeliveryFailures.map((row) => (
                    <tr key={row.whatsAppMessageId}>
                      <td>{row.recipientPhoneNumber}</td>
                      <td>{row.errorCode ?? '—'}</td>
                      <td>{row.errorMessage}</td>
                      <td>{formatDateTime(row.occurredAtUtc)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          <section className="compliance__section">
            <h2>Falhas registadas no nosso banco</h2>
            <p className="compliance__section-sub">Falhas ao chamar a API do WhatsApp - últimos 7 dias.</p>
            {failures.apiCallFailures.length === 0 ? (
              <p className="compliance__empty">Sem falhas de chamadas à API. 🎉</p>
            ) : (
              <table className="compliance__table">
                <thead>
                  <tr>
                    <th>Endpoint</th>
                    <th>HTTP</th>
                    <th>Código</th>
                    <th>Mensagem</th>
                    <th>Quando</th>
                  </tr>
                </thead>
                <tbody>
                  {failures.apiCallFailures.map((row, index) => (
                    <tr key={index}>
                      <td>{row.endpoint}</td>
                      <td>{row.httpStatusCode}</td>
                      <td>{row.errorCode ?? '—'}</td>
                      <td>{row.errorMessage}</td>
                      <td>{formatDateTime(row.occurredAtUtc)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          <section className="compliance__section">
            <h2>Falhas da IA</h2>
            <p className="compliance__section-sub">
              Mensagens que a IA não conseguiu responder (em retry automático, ou já desistidas) - últimos 7 dias.
            </p>
            {failures.aiFailures.length === 0 ? (
              <p className="compliance__empty">Sem falhas da IA registadas. 🎉</p>
            ) : (
              <table className="compliance__table">
                <thead>
                  <tr>
                    <th>Mensagem do utilizador</th>
                    <th>Tentativas</th>
                    <th>Último erro</th>
                    <th>Estado</th>
                    <th>Última tentativa</th>
                  </tr>
                </thead>
                <tbody>
                  {failures.aiFailures.map((row) => (
                    <tr key={row.conversationId + row.lastAttemptAtUtc}>
                      <td>{row.userMessage}</td>
                      <td>{row.attempts}</td>
                      <td>{row.lastError ?? '—'}</td>
                      <td>{row.status}</td>
                      <td>{formatDateTime(row.lastAttemptAtUtc)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </>
      )}
    </div>
  );
}

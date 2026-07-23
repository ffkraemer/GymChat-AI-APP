import { useEffect, useState, type FormEvent } from 'react';
import { useAuth } from '../auth/useAuth';
import {
  createFlow,
  listFlows,
  publishFlow,
  refreshFlowStatuses,
  registerFlowEncryptionKey,
  triggerFlow,
  type Flow,
} from '../api/flows';
import { ApiError } from '../api/client';
import './FlowsPage.css';

const STATUS_LABELS: Record<string, string> = {
  Draft: 'Rascunho',
  Published: 'Publicado',
  Deprecated: 'Descontinuado',
};

function statusClass(status: string): string {
  switch (status) {
    case 'Published':
      return 'flows__status--published';
    case 'Deprecated':
      return 'flows__status--deprecated';
    default:
      return 'flows__status--draft';
  }
}

export function FlowsPage() {
  const { user } = useAuth();
  const [flows, setFlows] = useState<Flow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [publicKeyPem, setPublicKeyPem] = useState('');
  const [isSavingKey, setIsSavingKey] = useState(false);
  const [keyMessage, setKeyMessage] = useState<string | null>(null);

  const [flowName, setFlowName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [triggerRecipient, setTriggerRecipient] = useState('');
  const [triggeringId, setTriggeringId] = useState<string | null>(null);
  const [triggerMessage, setTriggerMessage] = useState<string | null>(null);

  function load() {
    if (!user) return;
    setIsLoading(true);
    listFlows(user.gymId)
      .then(setFlows)
      .catch(() => setLoadError('Não foi possível carregar os Flows.'))
      .finally(() => setIsLoading(false));
  }

  useEffect(load, [user]);

  async function handleRegisterKey(event: FormEvent) {
    event.preventDefault();
    if (!user) return;
    setKeyMessage(null);
    setIsSavingKey(true);

    try {
      const result = await registerFlowEncryptionKey(user.gymId, publicKeyPem);
      setKeyMessage(result.success ? 'Chave pública registada com sucesso na Meta.' : 'A Meta rejeitou o registo da chave - confirma o formato PEM.');
    } catch (err) {
      setKeyMessage(err instanceof ApiError ? err.message : 'Não foi possível registar a chave.');
    } finally {
      setIsSavingKey(false);
    }
  }

  async function handleCreateFlow(event: FormEvent) {
    event.preventDefault();
    setCreateError(null);
    setIsCreating(true);

    try {
      const created = await createFlow(flowName);
      setFlows((current) => [created, ...current]);
      setFlowName('');
    } catch (err) {
      setCreateError(err instanceof ApiError ? err.message : 'Não foi possível criar o Flow.');
    } finally {
      setIsCreating(false);
    }
  }

  async function handlePublish(flowId: string) {
    setPublishingId(flowId);
    try {
      const updated = await publishFlow(flowId);
      setFlows((current) => current.map((f) => (f.id === flowId ? updated : f)));
    } catch (err) {
      setCreateError(err instanceof ApiError ? err.message : 'Não foi possível publicar o Flow.');
    } finally {
      setPublishingId(null);
    }
  }

  async function handleRefresh() {
    if (!user) return;
    setIsRefreshing(true);
    try {
      const updated = await refreshFlowStatuses(user.gymId);
      setFlows(updated);
    } catch {
      // Non-fatal - a retry click resolves it.
    } finally {
      setIsRefreshing(false);
    }
  }

  async function handleTrigger(flowId: string) {
    setTriggerMessage(null);
    setTriggeringId(flowId);
    try {
      await triggerFlow(flowId, {
        recipientPhoneNumber: triggerRecipient,
        bodyText: 'Configura as tuas preferências de notificações num instante!',
        flowCtaButtonText: 'Configurar',
      });
      setTriggerMessage('Enviado! Confirma no telemóvel do destinatário.');
    } catch (err) {
      setTriggerMessage(err instanceof ApiError ? err.message : 'Não foi possível enviar o Flow.');
    } finally {
      setTriggeringId(null);
    }
  }

  return (
    <div className="flows">
      <header className="flows__header">
        <h1>Flows</h1>
        <p>
          Formulários nativos do WhatsApp para as preferências de notificações - a alternativa
          mais rica ao menu de botões/listas, com seleção múltipla real.
        </p>
      </header>

      <form className="flows__key-form" onSubmit={handleRegisterKey}>
        <label className="flows__field">
          <span>Chave pública RSA (PEM) — passo único, antes de criares o primeiro Flow</span>
          <textarea
            value={publicKeyPem}
            onChange={(e) => setPublicKeyPem(e.target.value)}
            placeholder="-----BEGIN PUBLIC KEY-----&#10;...&#10;-----END PUBLIC KEY-----"
            rows={4}
          />
        </label>
        <button type="submit" className="flows__submit-small" disabled={isSavingKey || !publicKeyPem}>
          {isSavingKey ? 'A registar…' : 'Registar chave'}
        </button>
        {keyMessage && <div className="flows__message">{keyMessage}</div>}
      </form>

      <div className="flows__layout">
        <form className="flows__form" onSubmit={handleCreateFlow}>
          <h2>Novo Flow</h2>
          <label className="flows__field">
            <span>Nome</span>
            <input value={flowName} onChange={(e) => setFlowName(e.target.value)} placeholder="Ex: Preferências de notificações" required />
          </label>
          {createError && <div className="flows__error">{createError}</div>}
          <button type="submit" className="flows__submit" disabled={isCreating}>
            {isCreating ? 'A criar…' : 'Criar Flow'}
          </button>
        </form>

        <div className="flows__list">
          <div className="flows__list-header">
            <h2>Flows existentes</h2>
            <button type="button" className="flows__refresh" onClick={handleRefresh} disabled={isRefreshing}>
              {isRefreshing ? 'A sincronizar…' : 'Sincronizar estados'}
            </button>
          </div>

          {isLoading && <p className="flows__empty">A carregar…</p>}
          {loadError && <p className="flows__error">{loadError}</p>}
          {!isLoading && !loadError && flows.length === 0 && <p className="flows__empty">Ainda não há Flows. Cria o primeiro à esquerda.</p>}

          {flows.map((flow) => (
            <article key={flow.id} className="flows__card">
              <div className="flows__card-header">
                <span className="flows__card-name">{flow.name}</span>
                <span className={`flows__status ${statusClass(flow.status)}`}>{STATUS_LABELS[flow.status] ?? flow.status}</span>
              </div>

              {flow.status === 'Draft' && (
                <button type="button" className="flows__submit-small" onClick={() => handlePublish(flow.id)} disabled={publishingId === flow.id}>
                  {publishingId === flow.id ? 'A publicar…' : 'Publicar'}
                </button>
              )}

              {flow.status === 'Published' && (
                <div className="flows__trigger">
                  <input
                    value={triggerRecipient}
                    onChange={(e) => setTriggerRecipient(e.target.value)}
                    placeholder="Número de teste (ex: 351900000000)"
                  />
                  <button
                    type="button"
                    className="flows__submit-small"
                    onClick={() => handleTrigger(flow.id)}
                    disabled={triggeringId === flow.id || !triggerRecipient}
                  >
                    {triggeringId === flow.id ? 'A enviar…' : 'Testar'}
                  </button>
                </div>
              )}
              {triggerMessage && triggeringId === null && <div className="flows__message">{triggerMessage}</div>}
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}

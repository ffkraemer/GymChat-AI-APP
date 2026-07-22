import { useEffect, useState, type FormEvent } from 'react';
import { useAuth } from '../auth/useAuth';
import { createTemplateDraft, listTemplates, refreshTemplateStatuses, submitTemplate, type Template } from '../api/templates';
import { getGymById, resubscribeWebhook, setWhatsAppBusinessAccount } from '../api/gyms';
import { ApiError } from '../api/client';
import './TemplatesPage.css';

const CATEGORY_OPTIONS = [
  { value: '1', label: 'Marketing' },
  { value: '2', label: 'Utility' },
  { value: '3', label: 'Authentication' },
];

function statusClass(status: string): string {
  switch (status) {
    case 'Approved':
      return 'templates__status--approved';
    case 'Rejected':
      return 'templates__status--rejected';
    case 'PendingApproval':
      return 'templates__status--pending';
    case 'Paused':
    case 'Disabled':
      return 'templates__status--paused';
    default:
      return 'templates__status--draft';
  }
}

const STATUS_LABELS: Record<string, string> = {
  Draft: 'Rascunho',
  PendingApproval: 'Em análise pela Meta',
  Approved: 'Aprovado',
  Rejected: 'Rejeitado',
  Paused: 'Pausado',
  Disabled: 'Desativado',
};

export function TemplatesPage() {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [language, setLanguage] = useState('pt_PT');
  const [category, setCategory] = useState('2');
  const [bodyText, setBodyText] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [wabaId, setWabaId] = useState('');
  const [currentWabaId, setCurrentWabaId] = useState<string | null>(null);
  const [isSavingWaba, setIsSavingWaba] = useState(false);
  const [wabaMessage, setWabaMessage] = useState<string | null>(null);

  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  function load() {
    if (!user) return;
    setIsLoading(true);
    listTemplates(user.gymId)
      .then(setTemplates)
      .catch(() => setLoadError('Não foi possível carregar os templates.'))
      .finally(() => setIsLoading(false));

    // So the form shows "já configurado: ..." instead of always looking empty/unset,
    // even when a WABA id was already saved in a previous visit.
    getGymById(user.gymId)
      .then((gym) => {
        setCurrentWabaId(gym.whatsAppBusinessAccountId);
        if (gym.whatsAppBusinessAccountId) setWabaId(gym.whatsAppBusinessAccountId);
      })
      .catch(() => {
        // Non-fatal - the form just starts empty, as before.
      });
  }

  useEffect(load, [user]);

  async function handleSaveWaba(event: FormEvent) {
    event.preventDefault();
    if (!user) return;
    setWabaMessage(null);
    setIsSavingWaba(true);

    try {
      const result = await setWhatsAppBusinessAccount(user.gymId, wabaId);
      setCurrentWabaId(result.gym.whatsAppBusinessAccountId);
      setWabaMessage(
        result.webhookSubscriptionSucceeded
          ? 'Guardado - a App foi subscrita automaticamente para receber mensagens desta WABA.'
          : 'Guardado, mas não foi possível subscrever a App automaticamente. Tenta "Resubscrever" ou faz isso manualmente via Graph API Explorer.',
      );
    } catch (err) {
      setWabaMessage(err instanceof ApiError ? err.message : 'Não foi possível guardar o WABA ID.');
    } finally {
      setIsSavingWaba(false);
    }
  }

  async function handleResubscribe() {
    if (!user) return;
    setWabaMessage(null);
    setIsSavingWaba(true);

    try {
      const result = await resubscribeWebhook(user.gymId);
      setWabaMessage(result.success ? 'Subscrição confirmada com sucesso.' : 'Ainda não foi possível subscrever - confirma o WABA ID e o token de acesso.');
    } catch (err) {
      setWabaMessage(err instanceof ApiError ? err.message : 'Não foi possível tentar a subscrição.');
    } finally {
      setIsSavingWaba(false);
    }
  }

  async function handleCreateDraft(event: FormEvent) {
    event.preventDefault();
    setSaveError(null);
    setIsSaving(true);

    try {
      const created = await createTemplateDraft({ name, language, category: Number(category), bodyText });
      setTemplates((current) => [created, ...current]);
      setName('');
      setBodyText('');
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : 'Não foi possível criar o rascunho.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSubmit(templateId: string) {
    setSubmittingId(templateId);
    try {
      const updated = await submitTemplate(templateId);
      setTemplates((current) => current.map((t) => (t.id === templateId ? updated : t)));
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : 'Não foi possível submeter o template.');
    } finally {
      setSubmittingId(null);
    }
  }

  async function handleRefresh() {
    if (!user) return;
    setIsRefreshing(true);
    try {
      const updated = await refreshTemplateStatuses(user.gymId);
      setTemplates(updated);
    } catch {
      // Non-fatal - a retry click resolves it.
    } finally {
      setIsRefreshing(false);
    }
  }

  return (
    <div className="templates">
      <header className="templates__header">
        <h1>Templates</h1>
        <p>
          Cria e acompanha templates de mensagem do WhatsApp diretamente aqui - sem precisares
          de entrar no Meta Business Manager. Usa <code>{'{FirstName}'}</code>,{' '}
          <code>{'{GymName}'}</code> etc. no corpo da mensagem.
        </p>
      </header>

      <form className="templates__waba-form" onSubmit={handleSaveWaba}>
        <label className="templates__field templates__field--inline">
          <span>
            WhatsApp Business Account ID (necessário antes de submeteres templates)
            {currentWabaId && <strong className="templates__waba-current"> · já configurado: {currentWabaId}</strong>}
          </span>
          <div className="templates__waba-row">
            <input value={wabaId} onChange={(e) => setWabaId(e.target.value)} placeholder="Ex: 1022037357252228" />
            <button type="submit" className="templates__submit-small" disabled={isSavingWaba || !wabaId}>
              {isSavingWaba ? 'A guardar…' : currentWabaId ? 'Atualizar' : 'Guardar'}
            </button>
          </div>
        </label>
        {wabaMessage && (
          <div className="templates__waba-message">
            {wabaMessage}{' '}
            <button type="button" className="templates__link-button" onClick={handleResubscribe} disabled={isSavingWaba}>
              Resubscrever
            </button>
          </div>
        )}
      </form>

      <div className="templates__layout">
        <form className="templates__form" onSubmit={handleCreateDraft}>
          <h2>Novo template</h2>

          <label className="templates__field">
            <span>Nome (minúsculas e underscores)</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_'))}
              placeholder="Ex: boas_vindas"
              required
            />
          </label>

          <label className="templates__field">
            <span>Idioma</span>
            <input value={language} onChange={(e) => setLanguage(e.target.value)} placeholder="pt_PT" required />
          </label>

          <label className="templates__field">
            <span>Categoria</span>
            <select value={category} onChange={(e) => setCategory(e.target.value)}>
              {CATEGORY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>

          <label className="templates__field">
            <span>Corpo da mensagem</span>
            <textarea
              value={bodyText}
              onChange={(e) => setBodyText(e.target.value)}
              placeholder="Olá {FirstName}! Bem-vindo ao {GymName}."
              rows={4}
              required
            />
          </label>

          {saveError && <div className="templates__error">{saveError}</div>}

          <button type="submit" className="templates__submit" disabled={isSaving}>
            {isSaving ? 'A guardar…' : 'Criar rascunho'}
          </button>
        </form>

        <div className="templates__list">
          <div className="templates__list-header">
            <h2>Templates existentes</h2>
            <button type="button" className="templates__refresh" onClick={handleRefresh} disabled={isRefreshing}>
              {isRefreshing ? 'A sincronizar…' : 'Sincronizar estados'}
            </button>
          </div>

          {isLoading && <p className="templates__empty">A carregar…</p>}
          {loadError && <p className="templates__error">{loadError}</p>}
          {!isLoading && !loadError && templates.length === 0 && (
            <p className="templates__empty">Ainda não há templates. Cria o primeiro à esquerda.</p>
          )}

          {templates.map((template) => (
            <article key={template.id} className="templates__card">
              <div className="templates__card-header">
                <span className="templates__card-name">{template.name}</span>
                <span className={`templates__status ${statusClass(template.status)}`}>
                  {STATUS_LABELS[template.status] ?? template.status}
                </span>
              </div>
              <div className="templates__card-meta">
                {template.language} · {template.category}
              </div>
              <p className="templates__card-body">{template.bodyText}</p>
              {template.variableNames.length > 0 && (
                <div className="templates__card-variables">Variáveis: {template.variableNames.join(', ')}</div>
              )}
              {template.rejectionReason && <div className="templates__card-rejection">Motivo da rejeição: {template.rejectionReason}</div>}

              {template.status === 'Draft' && (
                <button
                  type="button"
                  className="templates__submit-small"
                  onClick={() => handleSubmit(template.id)}
                  disabled={submittingId === template.id}
                >
                  {submittingId === template.id ? 'A submeter…' : 'Submeter para aprovação'}
                </button>
              )}
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}

import { useEffect, useState, type FormEvent } from 'react';
import { useAuth } from '../auth/useAuth';
import {
  createTemplateDraft,
  deleteTemplate,
  listTemplates,
  refreshTemplateStatuses,
  submitTemplate,
  type Template,
} from '../api/templates';
import { ApiError } from '../api/client';
import { StatusBanner } from '../components/StatusBanner';
import { useStatusMessage } from '../components/useStatusMessage';
import { linkWhatsAppTemplate, listCampaigns, type Campaign } from '../api/campaigns';
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
  const pageStatus = useStatusMessage();

  const [name, setName] = useState('');
  const [language, setLanguage] = useState('pt_PT');
  const [category, setCategory] = useState('2');
  const [bodyText, setBodyText] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [linkingId, setLinkingId] = useState<string | null>(null);

  function load() {
    if (!user) return;
    setIsLoading(true);
    listTemplates(user.gymId)
      .then(setTemplates)
      .catch(() => pageStatus.showError('Não foi possível carregar os templates.'))
      .finally(() => setIsLoading(false));

    listCampaigns(user.gymId)
      .then(setCampaigns)
      .catch(() => {
        // Non-fatal - the linking section just stays empty.
      });
  }

  useEffect(load, [user]);

  async function handleLinkTemplate(campaignId: string, templateId: string) {
    pageStatus.clear();
    setLinkingId(campaignId);
    try {
      const updated = await linkWhatsAppTemplate(campaignId, templateId || null);
      setCampaigns((current) => current.map((c) => (c.id === campaignId ? updated : c)));
      pageStatus.showSuccess(templateId ? 'Campanha ligada ao template.' : 'Campanha desligada do template — volta a usar texto livre.');
    } catch (err) {
      pageStatus.showError(err instanceof ApiError ? err.message : 'Não foi possível ligar a campanha ao template.');
    } finally {
      setLinkingId(null);
    }
  }

  async function handleCreateDraft(event: FormEvent) {
    event.preventDefault();
    pageStatus.clear();
    setIsSaving(true);

    try {
      const created = await createTemplateDraft({ name, language, category: Number(category), bodyText });
      setTemplates((current) => [created, ...current]);
      setName('');
      setBodyText('');
    } catch (err) {
      pageStatus.showError(err instanceof ApiError ? err.message : 'Não foi possível criar o rascunho.');
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
      pageStatus.showInfo(err instanceof ApiError ? `Meta: ${err.message}` : 'Não foi possível submeter o template.');
    } finally {
      setSubmittingId(null);
    }
  }

  async function handleDelete(templateId: string) {
    setDeletingId(templateId);
    try {
      await deleteTemplate(templateId);
      setTemplates((current) => current.filter((t) => t.id !== templateId));
    } catch (err) {
      pageStatus.showError(err instanceof ApiError ? err.message : 'Não foi possível eliminar o rascunho.');
    } finally {
      setDeletingId(null);
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
          <code>{'{GymName}'}</code> etc. no corpo da mensagem. A WABA e a chave de encriptação
          configuram-se uma vez em <strong>Definições</strong>.
        </p>
      </header>

      {pageStatus.status && (
        <StatusBanner variant={pageStatus.status.variant} message={pageStatus.status.message} onDismiss={pageStatus.clear} />
      )}


      {campaigns.length > 0 && (
        <section className="templates__campaigns">
          <h2>Ligar campanhas a templates aprovados</h2>
          <p className="templates__campaigns-sub">
            Enquanto uma campanha não estiver ligada a um template <strong>Aprovado</strong>, continua a enviar texto
            livre (o aviso no Dashboard de Conformidade reflete isto).
          </p>
          <div className="templates__campaigns-list">
            {campaigns.map((campaign) => (
              <div key={campaign.id} className="templates__campaigns-row">
                <span className="templates__campaigns-name">{campaign.name}</span>
                <select
                  value={campaign.whatsAppMessageTemplateId ?? ''}
                  onChange={(e) => handleLinkTemplate(campaign.id, e.target.value)}
                  disabled={linkingId === campaign.id}
                >
                  <option value="">Sem template (texto livre)</option>
                  {templates
                    .filter((t) => t.status === 'Approved')
                    .map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                </select>
              </div>
            ))}
          </div>
        </section>
      )}

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
          {!isLoading && templates.length === 0 && (
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
              {template.categoryMismatch && (
                <div className="templates__card-mismatch">
                  A Meta recategorizou este template como <strong>{template.actualCategory}</strong> (submetido como {template.category}).
                </div>
              )}
              <p className="templates__card-body">{template.bodyText}</p>
              {template.variableNames.length > 0 && (
                <div className="templates__card-variables">Variáveis: {template.variableNames.join(', ')}</div>
              )}
              {template.rejectionReason && <div className="templates__card-rejection">Motivo da rejeição: {template.rejectionReason}</div>}

              {template.status === 'Draft' && (
                <div className="templates__card-actions">
                  <button
                    type="button"
                    className="templates__submit-small"
                    onClick={() => handleSubmit(template.id)}
                    disabled={submittingId === template.id}
                  >
                    {submittingId === template.id ? 'A submeter…' : 'Submeter para aprovação'}
                  </button>
                  <button
                    type="button"
                    className="templates__delete-small"
                    onClick={() => handleDelete(template.id)}
                    disabled={deletingId === template.id}
                  >
                    {deletingId === template.id ? 'A eliminar…' : 'Eliminar'}
                  </button>
                </div>
              )}
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}

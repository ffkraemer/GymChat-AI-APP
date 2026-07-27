import { useEffect, useState, type FormEvent } from 'react';
import { useAuth } from '../auth/useAuth';
import {
  activateCampaign,
  createCampaign,
  deactivateCampaign,
  listCampaigns,
  triggerManualCampaign,
  type Campaign,
} from '../api/campaigns';
import { listMembers, type Member } from '../api/members';
import { ApiError } from '../api/client';
import './CampaignsPage.css';

const TYPE_OPTIONS = [
  { value: '1', label: 'Boas-vindas (Welcome)' },
  { value: '2', label: 'Aniversário (Birthday)' },
  { value: '3', label: 'Reativação (Reactivation)' },
  { value: '4', label: 'Manual' },
];

const TYPE_LABELS: Record<string, string> = {
  Welcome: 'Boas-vindas',
  Birthday: 'Aniversário',
  Reactivation: 'Reativação',
  Manual: 'Manual',
};

function needsTriggerDayOffset(typeValue: string): boolean {
  return typeValue === '1' || typeValue === '3';
}

function triggerDayOffsetLabel(type: string): string {
  if (type === 'Welcome') return 'Dias após a inscrição';
  if (type === 'Reactivation') return 'Dias de inatividade';
  return '';
}

export function CampaignsPage() {
  const { user } = useAuth();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [type, setType] = useState('1');
  const [messageTemplate, setMessageTemplate] = useState('');
  const [triggerDayOffset, setTriggerDayOffset] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [togglingId, setTogglingId] = useState<string | null>(null);

  const [members, setMembers] = useState<Member[]>([]);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [triggeringId, setTriggeringId] = useState<string | null>(null);
  const [triggerMessage, setTriggerMessage] = useState<string | null>(null);
  const [expandedCampaignId, setExpandedCampaignId] = useState<string | null>(null);

  function load() {
    if (!user) return;
    setIsLoading(true);
    listCampaigns(user.gymId)
      .then(setCampaigns)
      .catch(() => setLoadError('Não foi possível carregar as campanhas.'))
      .finally(() => setIsLoading(false));
  }

  useEffect(load, [user]);

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    setSaveError(null);
    setIsSaving(true);

    try {
      const created = await createCampaign({
        name,
        type: Number(type),
        messageTemplate,
        triggerDayOffset: needsTriggerDayOffset(type) ? Number(triggerDayOffset) : null,
      });
      setCampaigns((current) => [created, ...current]);
      setName('');
      setMessageTemplate('');
      setTriggerDayOffset('');
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : 'Não foi possível criar a campanha.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleToggleActive(campaign: Campaign) {
    setTogglingId(campaign.id);
    try {
      const updated = campaign.isActive ? await deactivateCampaign(campaign.id) : await activateCampaign(campaign.id);
      setCampaigns((current) => current.map((c) => (c.id === campaign.id ? updated : c)));
    } catch {
      // Non-fatal - a retry click resolves it.
    } finally {
      setTogglingId(null);
    }
  }

  async function handleExpandManualTrigger(campaignId: string) {
    if (expandedCampaignId === campaignId) {
      setExpandedCampaignId(null);
      return;
    }

    setExpandedCampaignId(campaignId);
    setSelectedMemberIds([]);
    setTriggerMessage(null);

    if (user && members.length === 0) {
      try {
        setMembers(await listMembers(user.gymId));
      } catch {
        // Non-fatal - the member list just stays empty.
      }
    }
  }

  function toggleMemberSelection(memberId: string) {
    setSelectedMemberIds((current) => (current.includes(memberId) ? current.filter((id) => id !== memberId) : [...current, memberId]));
  }

  async function handleTrigger(campaignId: string) {
    setTriggeringId(campaignId);
    setTriggerMessage(null);
    try {
      const result = await triggerManualCampaign(campaignId, selectedMemberIds);
      setTriggerMessage(`Enviado a ${result.sentCount} de ${result.requested} membro(s) selecionado(s).`);
    } catch (err) {
      setTriggerMessage(err instanceof ApiError ? err.message : 'Não foi possível disparar a campanha.');
    } finally {
      setTriggeringId(null);
    }
  }

  return (
    <div className="campaigns">
      <header className="campaigns__header">
        <h1>Campanhas</h1>
        <p>
          Uma campanha é uma mensagem + uma regra de disparo. <strong>Boas-vindas</strong> dispara X dias após a
          inscrição, <strong>Aniversário</strong> no dia certo todos os anos, <strong>Reativação</strong> quando um
          membro fica X dias inativo, e <strong>Manual</strong> só quando a disparares aqui, para quem escolheres.
          Usa <code>{'{FirstName}'}</code>, <code>{'{FullName}'}</code>, <code>{'{GymName}'}</code> na mensagem. Liga a
          um template aprovado na página <strong>Templates</strong> para evitar o aviso de conformidade.
        </p>
      </header>

      <div className="campaigns__layout">
        <form className="campaigns__form" onSubmit={handleCreate}>
          <h2>Nova campanha</h2>

          <label className="campaigns__field">
            <span>Nome</span>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Boas-vindas" required />
          </label>

          <label className="campaigns__field">
            <span>Tipo</span>
            <select value={type} onChange={(e) => setType(e.target.value)}>
              {TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>

          {needsTriggerDayOffset(type) && (
            <label className="campaigns__field">
              <span>{type === '1' ? 'Dias após a inscrição' : 'Dias de inatividade'}</span>
              <input
                type="number"
                min="0"
                value={triggerDayOffset}
                onChange={(e) => setTriggerDayOffset(e.target.value)}
                placeholder="Ex: 7"
                required
              />
            </label>
          )}

          <label className="campaigns__field">
            <span>Mensagem</span>
            <textarea
              value={messageTemplate}
              onChange={(e) => setMessageTemplate(e.target.value)}
              placeholder="Olá {FirstName}! Bem-vindo(a) ao {GymName}."
              rows={4}
              required
            />
          </label>

          {saveError && <div className="campaigns__error">{saveError}</div>}

          <button type="submit" className="campaigns__submit" disabled={isSaving}>
            {isSaving ? 'A guardar…' : 'Criar campanha'}
          </button>
        </form>

        <div className="campaigns__list">
          {isLoading && <p className="campaigns__empty">A carregar…</p>}
          {loadError && <p className="campaigns__error">{loadError}</p>}
          {!isLoading && !loadError && campaigns.length === 0 && (
            <p className="campaigns__empty">Ainda não há campanhas. Cria a primeira à esquerda.</p>
          )}

          {campaigns.map((campaign) => (
            <article key={campaign.id} className={`campaigns__card${campaign.isActive ? '' : ' campaigns__card--inactive'}`}>
              <div className="campaigns__card-header">
                <div>
                  <span className="campaigns__card-name">{campaign.name}</span>
                  <span className="campaigns__card-type">{TYPE_LABELS[campaign.type] ?? campaign.type}</span>
                </div>
                <div className="campaigns__card-badges">
                  {!campaign.whatsAppMessageTemplateId && campaign.type !== 'Manual' && (
                    <span className="campaigns__badge campaigns__badge--warning">sem template ligado</span>
                  )}
                  {!campaign.isActive && <span className="campaigns__badge">Desativada</span>}
                </div>
              </div>

              {campaign.triggerDayOffset !== null && (
                <div className="campaigns__card-meta">
                  {triggerDayOffsetLabel(campaign.type)}: {campaign.triggerDayOffset}
                </div>
              )}

              <p className="campaigns__card-body">{campaign.messageTemplate}</p>

              <div className="campaigns__card-actions">
                <button type="button" className="campaigns__link-button" onClick={() => handleToggleActive(campaign)} disabled={togglingId === campaign.id}>
                  {togglingId === campaign.id ? '…' : campaign.isActive ? 'Desativar' : 'Reativar'}
                </button>
                {campaign.type === 'Manual' && (
                  <button type="button" className="campaigns__link-button" onClick={() => handleExpandManualTrigger(campaign.id)}>
                    {expandedCampaignId === campaign.id ? 'Fechar' : 'Disparar manualmente'}
                  </button>
                )}
              </div>

              {expandedCampaignId === campaign.id && (
                <div className="campaigns__trigger-panel">
                  <p className="campaigns__trigger-hint">Escolhe os membros a quem enviar:</p>
                  <div className="campaigns__member-list">
                    {members.length === 0 && <p className="campaigns__empty">Sem membros encontrados.</p>}
                    {members.map((member) => (
                      <label key={member.id} className="campaigns__member-row">
                        <input
                          type="checkbox"
                          checked={selectedMemberIds.includes(member.id)}
                          onChange={() => toggleMemberSelection(member.id)}
                        />
                        {member.fullName} · {member.phoneNumber}
                      </label>
                    ))}
                  </div>
                  <button
                    type="button"
                    className="campaigns__submit-small"
                    onClick={() => handleTrigger(campaign.id)}
                    disabled={triggeringId === campaign.id || selectedMemberIds.length === 0}
                  >
                    {triggeringId === campaign.id ? 'A enviar…' : `Enviar a ${selectedMemberIds.length} membro(s)`}
                  </button>
                  {triggerMessage && <div className="campaigns__trigger-message">{triggerMessage}</div>}
                </div>
              )}
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}

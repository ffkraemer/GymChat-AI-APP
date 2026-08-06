import { useEffect, useState, type FormEvent } from 'react';
import { useAuth } from '../auth/useAuth';
import { getGymById, listGyms, setWhatsAppBusinessAccount, type Gym } from '../api/gyms';
import { registerFlowEncryptionKey } from '../api/flows';
import { ApiError } from '../api/client';
import { StatusBanner } from '../components/StatusBanner';
import { useStatusMessage } from '../components/useStatusMessage';
import './SettingsPage.css';

export function SettingsPage() {
  const { user } = useAuth();
  const isPlatformAdmin = user?.roles.includes('PlatformAdmin') ?? false;

  const [gyms, setGyms] = useState<Gym[]>([]);
  const [selectedGymId, setSelectedGymId] = useState('');
  const [currentGym, setCurrentGym] = useState<Gym | null>(null);
  const [isLoadingGym, setIsLoadingGym] = useState(true);

  const [wabaId, setWabaId] = useState('');
  const [isSavingWaba, setIsSavingWaba] = useState(false);

  const [publicKeyPem, setPublicKeyPem] = useState('');
  const [isSavingKey, setIsSavingKey] = useState(false);
  const pageStatus = useStatusMessage();

  // PlatformAdmin picks which gym to manage; a regular Admin always manages their own.
  useEffect(() => {
    if (!isPlatformAdmin) return;

    listGyms()
      .then((result) => {
        setGyms(result);
        if (result.length > 0) setSelectedGymId((current) => current || result[0].id);
      })
      .catch(() => pageStatus.showError('Não foi possível carregar a lista de gyms.'));
  }, [isPlatformAdmin]);

  const activeGymId = isPlatformAdmin ? selectedGymId : user?.gymId;

  useEffect(() => {
    if (!activeGymId) {
      setIsLoadingGym(false);
      return;
    }

    setIsLoadingGym(true);
    getGymById(activeGymId)
      .then((gym) => {
        setCurrentGym(gym);
        setWabaId(gym.whatsAppBusinessAccountId ?? '');
      })
      .catch(() => setCurrentGym(null))
      .finally(() => setIsLoadingGym(false));
  }, [activeGymId]);

  async function handleSaveWaba(event: FormEvent) {
    event.preventDefault();
    if (!activeGymId) return;
    pageStatus.clear();
    setIsSavingWaba(true);

    try {
      const result = await setWhatsAppBusinessAccount(activeGymId, wabaId);
      setCurrentGym(result.gym);
      if (result.webhookSubscriptionSucceeded) {
        pageStatus.showSuccess('Guardado — a App foi subscrita automaticamente para receber mensagens desta WABA.');
      } else {
        pageStatus.showWarning('Guardado, mas não foi possível subscrever a App automaticamente. Podes tentar de novo mais tarde, ou fazer isso manualmente via Graph API Explorer.');
      }
    } catch (err) {
      pageStatus.showError(err instanceof ApiError ? err.message : 'Não foi possível guardar o WABA ID.');
    } finally {
      setIsSavingWaba(false);
    }
  }

  async function handleRegisterKey(event: FormEvent) {
    event.preventDefault();
    if (!activeGymId) return;
    pageStatus.clear();
    setIsSavingKey(true);

    try {
      const result = await registerFlowEncryptionKey(activeGymId, publicKeyPem);
      if (result.success) {
        pageStatus.showSuccess('Chave pública registada com sucesso na Meta.');
      } else {
        pageStatus.showInfo('Meta: rejeitou o registo da chave — confirma o formato PEM.');
      }
    } catch (err) {
      pageStatus.showError(err instanceof ApiError ? err.message : 'Não foi possível registar a chave.');
    } finally {
      setIsSavingKey(false);
    }
  }

  return (
    <div className="settings">

      <header className="settings__header">
        <h1>Definições</h1>
        <p>
          Configuração da integração com a Meta para este gym - WhatsApp Business Account e
          chave de encriptação para Flows. Só precisas de mexer aqui uma vez (ou quando algo mudar do lado da Meta).
        </p>
      </header>

      {pageStatus.status && (
        <StatusBanner variant={pageStatus.status.variant} message={pageStatus.status.message} onDismiss={pageStatus.clear} />
      )}


      {isPlatformAdmin && (
        <label className="settings__gym-select">
          <span>Gym</span>
          <select value={selectedGymId} onChange={(e) => setSelectedGymId(e.target.value)}>
            {gyms.map((gym) => (
              <option key={gym.id} value={gym.id}>
                {gym.name}
              </option>
            ))}
          </select>
        </label>
      )}

      {isLoadingGym && <p className="settings__empty">A carregar…</p>}

      {!isLoadingGym && currentGym && (
        <div className="settings__cards">
          <form className="settings__card" onSubmit={handleSaveWaba}>
            <h2>WhatsApp Business Account</h2>
            <p className="settings__card-sub">Necessário antes de submeteres templates ou criares Flows.</p>
            <label className="settings__field">
              <span>WABA ID</span>
              <input value={wabaId} onChange={(e) => setWabaId(e.target.value)} placeholder="Ex: 858972750355293" />
            </label>
            <button type="submit" className="settings__submit" disabled={isSavingWaba || !wabaId}>
              {isSavingWaba ? 'A guardar…' : currentGym.whatsAppBusinessAccountId ? 'Atualizar' : 'Guardar'}
            </button>
          </form>

          <form className="settings__card" onSubmit={handleRegisterKey}>
            <h2>Chave pública (Flows)</h2>
            <p className="settings__card-sub">Necessária antes de publicares o primeiro Flow deste gym.</p>
            <label className="settings__field">
              <span>Chave pública RSA (PEM)</span>
              <textarea
                value={publicKeyPem}
                onChange={(e) => setPublicKeyPem(e.target.value)}
                placeholder="-----BEGIN PUBLIC KEY-----&#10;...&#10;-----END PUBLIC KEY-----"
                rows={5}
              />
            </label>
            <button type="submit" className="settings__submit" disabled={isSavingKey || !publicKeyPem}>
              {isSavingKey ? 'A registar…' : 'Registar chave'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

import { useEffect, useState, type FormEvent } from 'react';
import { useAuth } from '../auth/useAuth';
import { createGym, listGyms, registerOperator, type Gym } from '../api/gyms';
import { ApiError } from '../api/client';
import './GymsPage.css';

export function GymsPage() {
  const { user } = useAuth();
  const isPlatformAdmin = user?.roles.includes('PlatformAdmin') ?? false;

  const [gyms, setGyms] = useState<Gym[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Create gym form
  const [gymName, setGymName] = useState('');
  const [phoneNumberId, setPhoneNumberId] = useState('');
  const [displayPhoneNumber, setDisplayPhoneNumber] = useState('');
  const [isSavingGym, setIsSavingGym] = useState(false);
  const [gymError, setGymError] = useState<string | null>(null);

  // Register operator form
  const [selectedGymId, setSelectedGymId] = useState('');
  const [operatorEmail, setOperatorEmail] = useState('');
  const [operatorPassword, setOperatorPassword] = useState('');
  const [operatorName, setOperatorName] = useState('');
  const [isSavingOperator, setIsSavingOperator] = useState(false);
  const [operatorError, setOperatorError] = useState<string | null>(null);
  const [operatorSuccess, setOperatorSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!isPlatformAdmin) return;

    listGyms()
      .then((result) => {
        setGyms(result);
        if (result.length > 0) setSelectedGymId((current) => current || result[0].id);
      })
      .catch(() => setLoadError('Não foi possível carregar os gyms.'))
      .finally(() => setIsLoading(false));
  }, [isPlatformAdmin]);

  if (!isPlatformAdmin) {
    return (
      <div className="gyms__denied">
        <h1>Acesso restrito</h1>
        <p>Esta página só está disponível para contas com o papel PlatformAdmin.</p>
      </div>
    );
  }

  async function handleCreateGym(event: FormEvent) {
    event.preventDefault();
    setGymError(null);
    setIsSavingGym(true);

    try {
      const created = await createGym({
        name: gymName,
        whatsAppPhoneNumberId: phoneNumberId,
        whatsAppDisplayPhoneNumber: displayPhoneNumber,
      });
      setGyms((current) => [created, ...current]);
      setSelectedGymId(created.id);
      setGymName('');
      setPhoneNumberId('');
      setDisplayPhoneNumber('');
    } catch (err) {
      setGymError(err instanceof ApiError ? err.message : 'Não foi possível criar o gym.');
    } finally {
      setIsSavingGym(false);
    }
  }

  async function handleRegisterOperator(event: FormEvent) {
    event.preventDefault();
    setOperatorError(null);
    setOperatorSuccess(null);
    setIsSavingOperator(true);

    try {
      const result = await registerOperator({
        email: operatorEmail,
        password: operatorPassword,
        fullName: operatorName,
        gymId: selectedGymId,
      });
      setOperatorSuccess(`Conta criada: ${result.email}`);
      setOperatorEmail('');
      setOperatorPassword('');
      setOperatorName('');
    } catch (err) {
      setOperatorError(err instanceof ApiError ? err.message : 'Não foi possível criar a conta.');
    } finally {
      setIsSavingOperator(false);
    }
  }

  return (
    <div className="gyms">
      <header className="gyms__header">
        <h1>Gyms</h1>
        <p>Área de gestão da plataforma: cria novos gyms clientes e o primeiro administrador de cada um.</p>
      </header>

      <div className="gyms__layout">
        <form className="gyms__form" onSubmit={handleCreateGym}>
          <h2>Novo gym</h2>

          <label className="gyms__field">
            <span>Nome</span>
            <input value={gymName} onChange={(e) => setGymName(e.target.value)} placeholder="Ex: Fitness Club Porto" required />
          </label>

          <label className="gyms__field">
            <span>WhatsApp Phone Number Id</span>
            <input value={phoneNumberId} onChange={(e) => setPhoneNumberId(e.target.value)} placeholder="Ex: 1246419255214816" required />
          </label>

          <label className="gyms__field">
            <span>Número de WhatsApp (exibição)</span>
            <input value={displayPhoneNumber} onChange={(e) => setDisplayPhoneNumber(e.target.value)} placeholder="Ex: +351 900 000 000" required />
          </label>

          {gymError && <div className="gyms__error">{gymError}</div>}

          <button type="submit" className="gyms__submit" disabled={isSavingGym}>
            {isSavingGym ? 'A criar…' : 'Criar gym'}
          </button>
        </form>

        <form className="gyms__form" onSubmit={handleRegisterOperator}>
          <h2>Novo administrador</h2>

          <label className="gyms__field">
            <span>Gym</span>
            <select value={selectedGymId} onChange={(e) => setSelectedGymId(e.target.value)} required>
              {gyms.map((gym) => (
                <option key={gym.id} value={gym.id}>
                  {gym.name}
                </option>
              ))}
            </select>
          </label>

          <label className="gyms__field">
            <span>Nome completo</span>
            <input value={operatorName} onChange={(e) => setOperatorName(e.target.value)} required />
          </label>

          <label className="gyms__field">
            <span>Email</span>
            <input type="email" value={operatorEmail} onChange={(e) => setOperatorEmail(e.target.value)} required />
          </label>

          <label className="gyms__field">
            <span>Password</span>
            <input type="password" value={operatorPassword} onChange={(e) => setOperatorPassword(e.target.value)} required minLength={8} />
          </label>

          {operatorError && <div className="gyms__error">{operatorError}</div>}
          {operatorSuccess && <div className="gyms__success">{operatorSuccess}</div>}

          <button type="submit" className="gyms__submit" disabled={isSavingOperator || gyms.length === 0}>
            {isSavingOperator ? 'A criar…' : 'Criar administrador'}
          </button>
        </form>
      </div>

      <section className="gyms__list">
        <h2>Gyms existentes</h2>
        {isLoading && <p className="gyms__empty">A carregar…</p>}
        {loadError && <p className="gyms__error">{loadError}</p>}
        {!isLoading && !loadError && gyms.length === 0 && <p className="gyms__empty">Ainda não há gyms criados.</p>}

        {gyms.map((gym) => (
          <div key={gym.id} className="gyms__card">
            <div className="gyms__card-name">{gym.name}</div>
            <div className="gyms__card-meta">
              {gym.whatsAppPhoneNumberId} · {gym.defaultLanguage}
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}

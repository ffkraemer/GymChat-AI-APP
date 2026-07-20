import { useEffect, useState, type FormEvent } from 'react';
import { useAuth } from '../auth/useAuth';
import {
  activateClassType,
  createClassType,
  deactivateClassType,
  listClassTypes,
  updateClassType,
  type ClassType,
} from '../api/classTypes';
import { listGyms, type Gym } from '../api/gyms';
import { ApiError } from '../api/client';
import './ClassTypesPage.css';

export function ClassTypesPage() {
  const { user } = useAuth();
  const isPlatformAdmin = user?.roles.includes('PlatformAdmin') ?? false;

  const [gyms, setGyms] = useState<Gym[]>([]);
  const [selectedGymId, setSelectedGymId] = useState('');

  const [classTypes, setClassTypes] = useState<ClassType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [togglingId, setTogglingId] = useState<string | null>(null);

  // PlatformAdmin has no gym of their own - they pick one from the list first.
  useEffect(() => {
    if (!isPlatformAdmin) return;

    listGyms()
      .then((result) => {
        setGyms(result);
        if (result.length > 0) setSelectedGymId((current) => current || result[0].id);
      })
      .catch(() => setLoadError('Não foi possível carregar os gyms.'));
  }, [isPlatformAdmin]);

  const activeGymId = isPlatformAdmin ? selectedGymId : user?.gymId;

  useEffect(() => {
    if (!activeGymId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    listClassTypes(activeGymId)
      .then(setClassTypes)
      .catch(() => setLoadError('Não foi possível carregar os tipos de aula.'))
      .finally(() => setIsLoading(false));
  }, [activeGymId]);

  function startEditing(classType: ClassType) {
    setEditingId(classType.id);
    setName(classType.name);
    setSaveError(null);
  }

  function cancelEditing() {
    setEditingId(null);
    setName('');
    setSaveError(null);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSaveError(null);

    if (!activeGymId) {
      setSaveError('Escolhe um gym primeiro.');
      return;
    }

    setIsSaving(true);

    try {
      if (editingId) {
        const updated = await updateClassType(editingId, name);
        setClassTypes((current) => current.map((c) => (c.id === editingId ? updated : c)));
        cancelEditing();
      } else {
        const created = await createClassType(name, activeGymId);
        setClassTypes((current) => [created, ...current]);
        setName('');
      }
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : 'Não foi possível guardar.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleToggleActive(classType: ClassType) {
    setTogglingId(classType.id);
    try {
      const updated = classType.isActive ? await deactivateClassType(classType.id) : await activateClassType(classType.id);
      setClassTypes((current) => current.map((c) => (c.id === classType.id ? updated : c)));
    } catch {
      // Non-fatal - a retry click resolves it.
    } finally {
      setTogglingId(null);
    }
  }

  if (isPlatformAdmin && gyms.length === 0 && !isLoading) {
    return (
      <div className="class-types">
        <header className="class-types__header">
          <h1>Aulas</h1>
          <p>Ainda não há nenhum gym criado. Cria um primeiro em "Gyms".</p>
        </header>
      </div>
    );
  }

  return (
    <div className="class-types">
      <header className="class-types__header">
        <h1>Aulas</h1>
        <p>
          Os tipos de aula que criares aqui aparecem no menu do WhatsApp quando um membro
          configura as suas preferências de notificação.
        </p>

        {isPlatformAdmin && (
          <label className="class-types__gym-select">
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
      </header>

      <div className="class-types__layout">
        <form className="class-types__form" onSubmit={handleSubmit}>
          <h2>{editingId ? 'Editar aula' : 'Nova aula'}</h2>

          <label className="class-types__field">
            <span>Nome</span>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Yoga, Spinning, CrossTraining…" required />
          </label>

          {saveError && <div className="class-types__error">{saveError}</div>}

          <div className="class-types__form-actions">
            <button type="submit" className="class-types__submit" disabled={isSaving || !activeGymId}>
              {isSaving ? 'A guardar…' : editingId ? 'Guardar alterações' : 'Adicionar aula'}
            </button>
            {editingId && (
              <button type="button" className="class-types__cancel" onClick={cancelEditing} disabled={isSaving}>
                Cancelar
              </button>
            )}
          </div>
        </form>

        <div className="class-types__list">
          {isLoading && <p className="class-types__empty">A carregar…</p>}
          {loadError && <p className="class-types__error">{loadError}</p>}
          {!isLoading && !loadError && classTypes.length === 0 && (
            <p className="class-types__empty">Ainda não há aulas configuradas. Cria a primeira à esquerda.</p>
          )}

          {classTypes.map((classType) => (
            <article key={classType.id} className={`class-types__card${classType.isActive ? '' : ' class-types__card--inactive'}`}>
              <div className="class-types__card-name">
                {classType.name}
                {!classType.isActive && <span className="class-types__badge">Desativada</span>}
              </div>
              <div className="class-types__card-actions">
                <button type="button" className="class-types__link-button" onClick={() => startEditing(classType)}>
                  Editar
                </button>
                <button
                  type="button"
                  className="class-types__link-button class-types__link-button--danger"
                  onClick={() => handleToggleActive(classType)}
                  disabled={togglingId === classType.id}
                >
                  {togglingId === classType.id ? '…' : classType.isActive ? 'Desativar' : 'Reativar'}
                </button>
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}

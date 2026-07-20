import { useEffect, useState, type FormEvent } from 'react';
import { useAuth } from '../auth/useAuth';
import { activateFaq, createFaq, deactivateFaq, listFaqs, updateFaq, type Faq } from '../api/faqs';
import { ChatBubble } from '../components/ChatBubble';
import { ApiError } from '../api/client';
import './FaqsPage.css';

export function FaqsPage() {
  const { user } = useAuth();
  const [faqs, setFaqs] = useState<Faq[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [category, setCategory] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [togglingId, setTogglingId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    listFaqs(user.gymId)
      .then(setFaqs)
      .catch(() => setLoadError('Não foi possível carregar as FAQs.'))
      .finally(() => setIsLoading(false));
  }, [user]);

  function startEditing(faq: Faq) {
    setEditingId(faq.id);
    setQuestion(faq.question);
    setAnswer(faq.answer);
    setCategory(faq.category ?? '');
    setSaveError(null);
  }

  function cancelEditing() {
    setEditingId(null);
    setQuestion('');
    setAnswer('');
    setCategory('');
    setSaveError(null);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSaveError(null);
    setIsSaving(true);

    try {
      if (editingId) {
        const updated = await updateFaq(editingId, { question, answer, category: category.trim() || undefined });
        setFaqs((current) => current.map((f) => (f.id === editingId ? updated : f)));
        cancelEditing();
      } else {
        const created = await createFaq({ question, answer, category: category.trim() || undefined });
        setFaqs((current) => [created, ...current]);
        setQuestion('');
        setAnswer('');
        setCategory('');
      }
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : 'Não foi possível guardar a FAQ.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleToggleActive(faq: Faq) {
    setTogglingId(faq.id);
    try {
      const updated = faq.isActive ? await deactivateFaq(faq.id) : await activateFaq(faq.id);
      setFaqs((current) => current.map((f) => (f.id === faq.id ? updated : f)));
    } catch {
      // Non-fatal - the list will just keep showing the previous state; a retry click resolves it.
    } finally {
      setTogglingId(null);
    }
  }

  return (
    <div className="faqs">
      <header className="faqs__header">
        <h1>FAQs</h1>
        <p>
          O que escreveres aqui é exatamente o que o assistente responde no WhatsApp — usa a
          pré-visualização para confirmar antes de guardar.
        </p>
      </header>

      <div className="faqs__layout">
        <form className="faqs__form" onSubmit={handleSubmit}>
          <h2>{editingId ? 'Editar FAQ' : 'Nova FAQ'}</h2>

          <label className="faqs__field">
            <span>Pergunta</span>
            <input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ex: Têm parqueamento?"
              required
            />
          </label>

          <label className="faqs__field">
            <span>Resposta</span>
            <textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Escreve a resposta como se estivesses a responder no WhatsApp…"
              rows={4}
              required
            />
          </label>

          <label className="faqs__field">
            <span>Categoria (opcional)</span>
            <input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Ex: Horários, Planos, Aulas…"
            />
          </label>

          {answer.trim() && (
            <div className="faqs__preview">
              <span className="faqs__preview-label">Pré-visualização</span>
              <ChatBubble text={answer} />
            </div>
          )}

          {saveError && <div className="faqs__error">{saveError}</div>}

          <div className="faqs__form-actions">
            <button type="submit" className="faqs__submit" disabled={isSaving}>
              {isSaving ? 'A guardar…' : editingId ? 'Guardar alterações' : 'Guardar FAQ'}
            </button>
            {editingId && (
              <button type="button" className="faqs__cancel" onClick={cancelEditing} disabled={isSaving}>
                Cancelar
              </button>
            )}
          </div>
        </form>

        <div className="faqs__list">
          {isLoading && <p className="faqs__empty">A carregar…</p>}
          {loadError && <p className="faqs__error">{loadError}</p>}
          {!isLoading && !loadError && faqs.length === 0 && (
            <p className="faqs__empty">Ainda não há FAQs. Cria a primeira à esquerda.</p>
          )}

          {faqs.map((faq) => (
            <article key={faq.id} className={`faqs__card${faq.isActive ? '' : ' faqs__card--inactive'}`}>
              <div className="faqs__card-header">
                <h3>{faq.question}</h3>
                <div className="faqs__card-badges">
                  {faq.category && <span className="faqs__badge">{faq.category}</span>}
                  {!faq.isActive && <span className="faqs__badge faqs__badge--inactive">Desativada</span>}
                </div>
              </div>
              <ChatBubble text={faq.answer} />
              <div className="faqs__card-actions">
                <button type="button" className="faqs__link-button" onClick={() => startEditing(faq)}>
                  Editar
                </button>
                <button
                  type="button"
                  className="faqs__link-button faqs__link-button--danger"
                  onClick={() => handleToggleActive(faq)}
                  disabled={togglingId === faq.id}
                >
                  {togglingId === faq.id ? '…' : faq.isActive ? 'Desativar' : 'Reativar'}
                </button>
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}

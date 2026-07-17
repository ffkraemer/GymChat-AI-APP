import { useEffect, useState, type FormEvent } from 'react';
import { useAuth } from '../auth/useAuth';
import { createFaq, listFaqs, type Faq } from '../api/faqs';
import { ChatBubble } from '../components/ChatBubble';
import { ApiError } from '../api/client';
import './FaqsPage.css';

export function FaqsPage() {
  const { user } = useAuth();
  const [faqs, setFaqs] = useState<Faq[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [category, setCategory] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    listFaqs(user.gymId)
      .then(setFaqs)
      .catch(() => setLoadError('Não foi possível carregar as FAQs.'))
      .finally(() => setIsLoading(false));
  }, [user]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSaveError(null);
    setIsSaving(true);

    try {
      const created = await createFaq({
        question,
        answer,
        category: category.trim() || undefined,
      });
      setFaqs((current) => [created, ...current]);
      setQuestion('');
      setAnswer('');
      setCategory('');
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : 'Não foi possível guardar a FAQ.');
    } finally {
      setIsSaving(false);
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
          <h2>Nova FAQ</h2>

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

          <button type="submit" className="faqs__submit" disabled={isSaving}>
            {isSaving ? 'A guardar…' : 'Guardar FAQ'}
          </button>
        </form>

        <div className="faqs__list">
          {isLoading && <p className="faqs__empty">A carregar…</p>}
          {loadError && <p className="faqs__error">{loadError}</p>}
          {!isLoading && !loadError && faqs.length === 0 && (
            <p className="faqs__empty">Ainda não há FAQs. Cria a primeira à esquerda.</p>
          )}

          {faqs.map((faq) => (
            <article key={faq.id} className="faqs__card">
              <div className="faqs__card-header">
                <h3>{faq.question}</h3>
                {faq.category && <span className="faqs__badge">{faq.category}</span>}
              </div>
              <ChatBubble text={faq.answer} />
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}

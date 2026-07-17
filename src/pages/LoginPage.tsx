import { useState, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';
import { ApiError } from '../api/client';
import './LoginPage.css';

export function LoginPage() {
  const { user, login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (user) return <Navigate to="/faqs" replace />;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await login(email, password);
    } catch (err) {
      setError(err instanceof ApiError && err.status === 401 ? 'Email ou password incorretos.' : 'Não foi possível iniciar sessão. Tenta novamente.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="login">
      <div className="login__panel">
        <div className="login__brand">
          <span className="login__brand-mark">GC</span>
          <span className="login__brand-name">GymChat AI</span>
        </div>

        <h1 className="login__title">Entrar na administração</h1>
        <p className="login__subtitle">Gere as FAQs que o teu assistente responde no WhatsApp.</p>

        <form className="login__form" onSubmit={handleSubmit}>
          <label className="login__field">
            <span>Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </label>

          <label className="login__field">
            <span>Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </label>

          {error && <div className="login__error">{error}</div>}

          <button type="submit" className="login__submit" disabled={isSubmitting}>
            {isSubmitting ? 'A entrar…' : 'Entrar'}
          </button>
        </form>

        <p className="login__hint">
          Conta de demonstração: <code>admin@demo.gymchat.ai</code> / <code>GymChat!Demo123</code>
        </p>
      </div>

      <div className="login__showcase">
        <div className="login__showcase-inner">
          <div className="login__phone">
            <div className="login__phone-bubble login__phone-bubble--in">Qual o horário de funcionamento?</div>
            <div className="login__phone-bubble login__phone-bubble--out">
              Estamos abertos de segunda a sexta das 07h00 às 22h00, e aos sábados das 09h00 às 14h00. 💪
            </div>
          </div>
          <p className="login__showcase-caption">
            Cada FAQ que crias aqui é a resposta exata que o assistente envia no WhatsApp.
          </p>
        </div>
      </div>
    </div>
  );
}

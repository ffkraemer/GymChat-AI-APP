import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  getFlowScreens,
  listFlows,
  publishFlow,
  saveFlowScreens,
  setFlowEndpoint,
  type ComponentDefinitionInput,
  type Flow,
  type ScreenDefinitionInput,
} from '../api/flows';
import { useAuth } from '../auth/useAuth';
import { ApiError } from '../api/client';
import './FlowDesignerPage.css';

const COMPONENT_TYPES: { value: number; label: string }[] = [
  { value: 1, label: 'Título (TextHeading)' },
  { value: 2, label: 'Texto (TextBody)' },
  { value: 3, label: 'Campo de texto (TextInput)' },
  { value: 4, label: 'Lista suspensa (Dropdown)' },
  { value: 5, label: 'Seleção múltipla (CheckboxGroup)' },
  { value: 6, label: 'Escolha única (RadioButtonsGroup)' },
  { value: 7, label: 'Rodapé / botão (Footer)' },
];

const OPTIONS_SOURCES: { value: number; label: string }[] = [
  { value: 1, label: 'Opções fixas (defines aqui)' },
  { value: 2, label: 'Tipos de aula do gym (dinâmico)' },
  { value: 3, label: 'Dias da semana (dinâmico)' },
];

const FOOTER_ACTIONS: { value: number; label: string }[] = [
  { value: 1, label: 'Avançar para outro ecrã' },
  { value: 2, label: 'Terminar o Flow (guardar respostas)' },
];

const TYPE_NAME_TO_VALUE: Record<string, number> = {
  TextHeading: 1,
  TextBody: 2,
  TextInput: 3,
  Dropdown: 4,
  CheckboxGroup: 5,
  RadioButtonsGroup: 6,
  Footer: 7,
};

const OPTIONS_SOURCE_NAME_TO_VALUE: Record<string, number> = { Static: 1, GymClassTypes: 2, DaysOfWeek: 3 };
const FOOTER_ACTION_NAME_TO_VALUE: Record<string, number> = { Navigate: 1, Complete: 2 };

let keyCounter = 0;
function nextKey(): string {
  keyCounter += 1;
  return `k${keyCounter}`;
}

interface EditableComponent extends ComponentDefinitionInput {
  _key: string;
}

interface EditableScreen {
  _key: string;
  screenId: string;
  title: string;
  components: EditableComponent[];
}

function needsVariableName(type: number): boolean {
  return type === 3 || type === 4 || type === 5 || type === 6;
}

function isOptionsComponent(type: number): boolean {
  return type === 4 || type === 5 || type === 6;
}

function staticOptionsToLines(json: string | null | undefined): string {
  if (!json) return '';
  try {
    const options = JSON.parse(json) as { id: string; title: string }[];
    return options.map((o) => `${o.id},${o.title}`).join('\n');
  } catch {
    return '';
  }
}

function linesToStaticOptionsJson(lines: string): string {
  const options = lines
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [id, ...rest] = line.split(',');
      const title = rest.join(',').trim();
      return { id: id.trim(), title: title || id.trim() };
    });
  return JSON.stringify(options);
}

export function FlowDesignerPage() {
  const { flowId } = useParams<{ flowId: string }>();
  const { user } = useAuth();
  const [flow, setFlow] = useState<Flow | null>(null);
  const [screens, setScreens] = useState<EditableScreen[]>([]);
  const [selectedScreenKey, setSelectedScreenKey] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<{ error: string | null; message: string | null }[]>([]);

  const [endpointUrl, setEndpointUrl] = useState('');
  const [isSettingEndpoint, setIsSettingEndpoint] = useState(false);
  const [endpointMessage, setEndpointMessage] = useState<string | null>(null);

  const [isPublishing, setIsPublishing] = useState(false);
  const [publishMessage, setPublishMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    listFlows(user.gymId)
      .then((result) => setFlow(result.find((f) => f.id === flowId) ?? null))
      .catch(() => {
        // Non-fatal - the header just won't show the flow's name/status.
      });
  }, [user, flowId]);

  async function handleSetEndpoint() {
    if (!flowId) return;
    setEndpointMessage(null);
    setIsSettingEndpoint(true);
    try {
      const result = await setFlowEndpoint(flowId, endpointUrl);
      setEndpointMessage(
        result.success ? 'Endpoint definido com sucesso.' : 'A Meta não aceitou este endpoint - confirma se é acessível publicamente (ngrok ativo).',
      );
    } catch (err) {
      setEndpointMessage(err instanceof ApiError ? err.message : 'Não foi possível definir o endpoint.');
    } finally {
      setIsSettingEndpoint(false);
    }
  }

  async function handlePublish() {
    if (!flowId) return;
    setPublishMessage(null);
    setIsPublishing(true);
    try {
      const updated = await publishFlow(flowId);
      setFlow(updated);
      setPublishMessage('Flow publicado com sucesso.');
    } catch (err) {
      setPublishMessage(err instanceof ApiError ? err.message : 'Não foi possível publicar o Flow.');
    } finally {
      setIsPublishing(false);
    }
  }

  useEffect(() => {
    if (!flowId) return;
    setIsLoading(true);

    getFlowScreens(flowId)
      .then((result) => {
        const editable = result.map((screen) => ({
          _key: nextKey(),
          screenId: screen.screenId,
          title: screen.title,
          components: screen.components.map((c) => ({
            _key: nextKey(),
            type: TYPE_NAME_TO_VALUE[c.type] ?? 2,
            label: c.label,
            variableName: c.variableName ?? undefined,
            required: c.required,
            optionsSource: c.optionsSource ? OPTIONS_SOURCE_NAME_TO_VALUE[c.optionsSource] : undefined,
            staticOptionsJson: c.staticOptionsJson ?? undefined,
            footerAction: c.footerAction ? FOOTER_ACTION_NAME_TO_VALUE[c.footerAction] : undefined,
            footerNextScreenId: c.footerNextScreenId ?? undefined,
            footerButtonLabel: c.footerButtonLabel ?? undefined,
          })),
        }));
        setScreens(editable);
        if (editable.length > 0) setSelectedScreenKey(editable[0]._key);
      })
      .catch(() => setLoadError('Não foi possível carregar os ecrãs deste Flow.'))
      .finally(() => setIsLoading(false));
  }, [flowId]);

  const selectedScreen = screens.find((s) => s._key === selectedScreenKey) ?? null;

  function updateScreen(key: string, updater: (screen: EditableScreen) => EditableScreen) {
    setScreens((current) => current.map((s) => (s._key === key ? updater(s) : s)));
  }

  function addScreen() {
    const newScreen: EditableScreen = {
      _key: nextKey(),
      screenId: `ECRA_${String.fromCharCode(65 + (screens.length % 26))}`,
      title: `Ecrã ${screens.length + 1}`,
      components: [{ _key: nextKey(), type: 7, label: 'Guardar', footerAction: 2, footerButtonLabel: 'Guardar' }],
    };
    setScreens((current) => [...current, newScreen]);
    setSelectedScreenKey(newScreen._key);
  }

  function removeScreen(key: string) {
    setScreens((current) => current.filter((s) => s._key !== key));
    if (selectedScreenKey === key) setSelectedScreenKey(null);
  }

  function moveScreen(key: string, direction: -1 | 1) {
    setScreens((current) => {
      const index = current.findIndex((s) => s._key === key);
      const target = index + direction;
      if (target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function addComponent(screenKey: string) {
    updateScreen(screenKey, (screen) => ({
      ...screen,
      components: [...screen.components, { _key: nextKey(), type: 2, label: '' }],
    }));
  }

  function removeComponent(screenKey: string, componentKey: string) {
    updateScreen(screenKey, (screen) => ({
      ...screen,
      components: screen.components.filter((c) => c._key !== componentKey),
    }));
  }

  function moveComponent(screenKey: string, componentKey: string, direction: -1 | 1) {
    updateScreen(screenKey, (screen) => {
      const index = screen.components.findIndex((c) => c._key === componentKey);
      const target = index + direction;
      if (target < 0 || target >= screen.components.length) return screen;
      const next = [...screen.components];
      [next[index], next[target]] = [next[target], next[index]];
      return { ...screen, components: next };
    });
  }

  function updateComponent(screenKey: string, componentKey: string, patch: Partial<EditableComponent>) {
    updateScreen(screenKey, (screen) => ({
      ...screen,
      components: screen.components.map((c) => (c._key === componentKey ? { ...c, ...patch } : c)),
    }));
  }

  async function handleSave() {
    if (!flowId) return;
    setSaveMessage(null);
    setValidationErrors([]);

    for (const screen of screens) {
      const footer = screen.components.find((c) => c.type === 7);
      if (footer?.footerAction === 1 && !footer.footerNextScreenId) {
        setSaveMessage(
          `O ecrã "${screen.title || screen.screenId}" tem o rodapé a "Avançar para outro ecrã", mas não escolheste para qual. ` +
            'Escolhe um ecrã de destino, ou muda a ação para "Terminar o Flow".',
        );
        return;
      }
    }

    const hasTerminalScreen = screens.some((screen) => screen.components.some((c) => c.type === 7 && c.footerAction === 2));
    if (!hasTerminalScreen) {
      setSaveMessage('Pelo menos um ecrã tem de terminar o Flow (rodapé com ação "Terminar o Flow") - a Meta exige isto para aceitar a publicação.');
      return;
    }

    setIsSaving(true);

    const payload: ScreenDefinitionInput[] = screens.map((screen) => ({
      screenId: screen.screenId,
      title: screen.title,
      components: screen.components.map((c) => ({
        type: c.type,
        label: c.label,
        variableName: c.variableName || undefined,
        required: c.required,
        optionsSource: c.optionsSource,
        staticOptionsJson: c.staticOptionsJson,
        footerAction: c.footerAction,
        footerNextScreenId: c.footerNextScreenId,
        footerButtonLabel: c.footerButtonLabel,
      })),
    }));

    try {
      const result = await saveFlowScreens(flowId, payload);
      if (result.validationErrors?.length > 0) {
        setValidationErrors(result.validationErrors);
        setSaveMessage('Guardado, mas a Meta reportou avisos de validação - revê abaixo.');
      } else {
        setSaveMessage('Desenho guardado e enviado para a Meta com sucesso.');
      }
    } catch (err) {
      setSaveMessage(err instanceof ApiError ? err.message : 'Não foi possível guardar o desenho.');
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) return <div className="designer">A carregar…</div>;
  if (loadError) return <div className="designer designer__error">{loadError}</div>;

  return (
    <div className="designer">
      <header className="designer__header">
        <div>
          <h1>Flow Designer{flow ? ` — ${flow.name}` : ''}</h1>
          <p>Define os ecrãs e as perguntas deste Flow. Guarda para compilar e enviar o resultado para a Meta.</p>
        </div>
        <button type="button" className="designer__save" onClick={handleSave} disabled={isSaving || screens.length === 0}>
          {isSaving ? 'A guardar…' : 'Guardar desenho'}
        </button>
      </header>

      {flow?.status === 'Draft' && (
        <div className="designer__setup-panel">
          <div className="designer__setup-field">
            <span>Endpoint (URL pública do <em>data exchange</em> - necessário antes de publicar)</span>
            <div className="designer__setup-row">
              <input
                value={endpointUrl}
                onChange={(e) => setEndpointUrl(e.target.value)}
                placeholder="https://xxxx.ngrok-free.dev/webhooks/whatsapp/flow-data-exchange"
              />
              <button type="button" className="designer__setup-button" onClick={handleSetEndpoint} disabled={isSettingEndpoint || !endpointUrl}>
                {isSettingEndpoint ? 'A definir…' : 'Definir endpoint'}
              </button>
            </div>
            {endpointMessage && <div className="designer__message">{endpointMessage}</div>}
          </div>

          <button type="button" className="designer__publish-button" onClick={handlePublish} disabled={isPublishing}>
            {isPublishing ? 'A publicar…' : 'Publicar Flow'}
          </button>
          {publishMessage && <div className="designer__message">{publishMessage}</div>}
        </div>
      )}
      {flow && flow.status !== 'Draft' && (
        <div className="designer__setup-panel">
          <span className="designer__published-note">
            Este Flow já está <strong>{flow.status === 'Published' ? 'Publicado' : flow.status}</strong> - para mudares os ecrãs, grava aqui e
            volta a publicar (a Meta reverte para Rascunho automaticamente quando o JSON muda).
          </span>
        </div>
      )}

      {saveMessage && <div className="designer__message">{saveMessage}</div>}
      {validationErrors.length > 0 && (
        <div className="designer__validation-errors">
          {validationErrors.map((e, i) => (
            <div key={i}>
              {e.error ? `${e.error}: ` : ''}
              {e.message}
            </div>
          ))}
        </div>
      )}

      <div className="designer__layout">
        <div className="designer__screens-panel">
          <div className="designer__panel-header">
            <h2>Ecrãs</h2>
            <button type="button" className="designer__add-button" onClick={addScreen}>
              + Ecrã
            </button>
          </div>
          {screens.map((screen, index) => (
            <div key={screen._key} className={`designer__screen-row${screen._key === selectedScreenKey ? ' designer__screen-row--active' : ''}`}>
              <button type="button" className="designer__screen-select" onClick={() => setSelectedScreenKey(screen._key)}>
                {index + 1}. {screen.title || screen.screenId}
              </button>
              <div className="designer__screen-row-actions">
                <button type="button" onClick={() => moveScreen(screen._key, -1)} disabled={index === 0} title="Mover para cima">
                  ↑
                </button>
                <button type="button" onClick={() => moveScreen(screen._key, 1)} disabled={index === screens.length - 1} title="Mover para baixo">
                  ↓
                </button>
                <button type="button" onClick={() => removeScreen(screen._key)} title="Remover ecrã" className="designer__remove-button">
                  ✕
                </button>
              </div>
            </div>
          ))}
          {screens.length === 0 && <p className="designer__empty">Sem ecrãs ainda - adiciona o primeiro.</p>}
        </div>

        <div className="designer__components-panel">
          {!selectedScreen && <p className="designer__empty">Seleciona ou cria um ecrã à esquerda.</p>}

          {selectedScreen && (
            <>
              <div className="designer__screen-meta">
                <label>
                  <span>ID do ecrã (só letras e underscores - a Meta rejeita números)</span>
                  <input
                    value={selectedScreen.screenId}
                    onChange={(e) =>
                      updateScreen(selectedScreen._key, (s) => ({ ...s, screenId: e.target.value.toUpperCase().replace(/[^A-Z_]/g, '_') }))
                    }
                  />
                </label>
                <label>
                  <span>Título</span>
                  <input value={selectedScreen.title} onChange={(e) => updateScreen(selectedScreen._key, (s) => ({ ...s, title: e.target.value }))} />
                </label>
              </div>

              <div className="designer__panel-header">
                <h2>Componentes</h2>
                <button type="button" className="designer__add-button" onClick={() => addComponent(selectedScreen._key)}>
                  + Componente
                </button>
              </div>

              {selectedScreen.components.map((component, index) => (
                <div key={component._key} className="designer__component-card">
                  <div className="designer__component-header">
                    <select
                      value={component.type}
                      onChange={(e) => updateComponent(selectedScreen._key, component._key, { type: Number(e.target.value) })}
                    >
                      {COMPONENT_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                    <div className="designer__component-actions">
                      <button type="button" onClick={() => moveComponent(selectedScreen._key, component._key, -1)} disabled={index === 0}>
                        ↑
                      </button>
                      <button
                        type="button"
                        onClick={() => moveComponent(selectedScreen._key, component._key, 1)}
                        disabled={index === selectedScreen.components.length - 1}
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        className="designer__remove-button"
                        onClick={() => removeComponent(selectedScreen._key, component._key)}
                      >
                        ✕
                      </button>
                    </div>
                  </div>

                  <label className="designer__component-field">
                    <span>{component.type === 7 ? 'Texto do botão' : 'Texto / pergunta'}</span>
                    <textarea
                      value={component.type === 7 ? component.footerButtonLabel ?? '' : component.label}
                      onChange={(e) =>
                        component.type === 7
                          ? updateComponent(selectedScreen._key, component._key, { footerButtonLabel: e.target.value, label: e.target.value })
                          : updateComponent(selectedScreen._key, component._key, { label: e.target.value })
                      }
                      rows={2}
                    />
                  </label>

                  {needsVariableName(component.type) && (
                    <label className="designer__component-field">
                      <span>Nome da variável (aparece na resposta final)</span>
                      <input
                        value={component.variableName ?? ''}
                        onChange={(e) => updateComponent(selectedScreen._key, component._key, { variableName: e.target.value })}
                        placeholder="Ex: selected_classes"
                      />
                    </label>
                  )}

                  {needsVariableName(component.type) && (
                    <label className="designer__component-checkbox">
                      <input
                        type="checkbox"
                        checked={component.required ?? false}
                        onChange={(e) => updateComponent(selectedScreen._key, component._key, { required: e.target.checked })}
                      />
                      Obrigatório
                    </label>
                  )}

                  {isOptionsComponent(component.type) && (
                    <label className="designer__component-field">
                      <span>Origem das opções</span>
                      <select
                        value={component.optionsSource ?? 1}
                        onChange={(e) => updateComponent(selectedScreen._key, component._key, { optionsSource: Number(e.target.value) })}
                      >
                        {OPTIONS_SOURCES.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}

                  {isOptionsComponent(component.type) && component.optionsSource === 1 && (
                    <label className="designer__component-field">
                      <span>Opções (uma por linha: id,título)</span>
                      <textarea
                        value={staticOptionsToLines(component.staticOptionsJson)}
                        onChange={(e) =>
                          updateComponent(selectedScreen._key, component._key, { staticOptionsJson: linesToStaticOptionsJson(e.target.value) })
                        }
                        placeholder={'yes,Sim\nno,Não'}
                        rows={3}
                      />
                    </label>
                  )}

                  {component.type === 7 && (
                    <>
                      <label className="designer__component-field">
                        <span>Ação do botão</span>
                        <select
                          value={component.footerAction ?? 2}
                          onChange={(e) => updateComponent(selectedScreen._key, component._key, { footerAction: Number(e.target.value) })}
                        >
                          {FOOTER_ACTIONS.map((a) => (
                            <option key={a.value} value={a.value}>
                              {a.label}
                            </option>
                          ))}
                        </select>
                      </label>

                      {component.footerAction === 1 && (
                        <label className="designer__component-field">
                          <span>Próximo ecrã</span>
                          <select
                            value={component.footerNextScreenId ?? ''}
                            onChange={(e) => updateComponent(selectedScreen._key, component._key, { footerNextScreenId: e.target.value })}
                          >
                            <option value="">Escolhe um ecrã…</option>
                            {screens
                              .filter((s) => s._key !== selectedScreen._key)
                              .map((s) => (
                                <option key={s._key} value={s.screenId}>
                                  {s.title || s.screenId}
                                </option>
                              ))}
                          </select>
                        </label>
                      )}
                    </>
                  )}
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useAuth } from "../auth/useAuth";
import {
  createFlow,
  deleteFlow,
  getFlowJson,
  getFlowScreens,
  listFlows,
  publishFlow,
  refreshFlowStatuses,
  saveFlowScreens,
  setFlowEndpoint,
  triggerFlow,
  updateFlowJson,
  type ComponentDefinitionInput,
  type Flow,
  type ScreenDefinitionInput,
} from "../api/flows";
import { ApiError } from "../api/client";
import "./FlowsPage.css";

const STATUS_LABELS: Record<string, string> = {
  Draft: "Rascunho",
  Published: "Publicado",
  Deprecated: "Descontinuado",
};

function statusClass(status: string): string {
  switch (status) {
    case "Published":
      return "flows__status--published";
    case "Deprecated":
      return "flows__status--deprecated";
    default:
      return "flows__status--draft";
  }
}

// ---- Design mode (structured screens/components editor) ----

const COMPONENT_TYPES = [
  { value: 1, label: "Título" },
  { value: 2, label: "Texto" },
  { value: 3, label: "Campo de texto" },
  { value: 4, label: "Lista suspensa" },
  { value: 5, label: "Seleção múltipla" },
  { value: 6, label: "Escolha única" },
  { value: 7, label: "Rodapé" },
];
const OPTIONS_SOURCES = [
  { value: 1, label: "Opções fixas" },
  { value: 2, label: "Tipos de aula do gym" },
  { value: 3, label: "Dias da semana" },
  { value: 4, label: "Períodos do dia" },
];
const FOOTER_ACTIONS = [
  { value: 1, label: "Avançar para outro ecrã" },
  { value: 2, label: "Terminar o Flow" },
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
const OPTIONS_SOURCE_NAME_TO_VALUE: Record<string, number> = {
  Static: 1,
  GymClassTypes: 2,
  DaysOfWeek: 3,
  TimeWindows: 4,
};
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

function needsVariableName(type: number) {
  return type === 3 || type === 4 || type === 5 || type === 6;
}
function isOptionsComponent(type: number) {
  return type === 4 || type === 5 || type === 6;
}
function staticOptionsToLines(json: string | null | undefined): string {
  if (!json) return "";
  try {
    return (JSON.parse(json) as { id: string; title: string }[]).map((o) => `${o.id},${o.title}`).join("\n");
  } catch {
    return "";
  }
}
function linesToStaticOptionsJson(lines: string): string {
  const options = lines
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const [id, ...rest] = l.split(",");
      const title = rest.join(",").trim();
      return { id: id.trim(), title: title || id.trim() };
    });
  return JSON.stringify(options);
}

function renderDesignPreview(component: EditableComponent, index: number) {
  switch (component.type) {
    case 1:
      return (
        <div className="fpreview__heading" key={index}>
          {component.label}
        </div>
      );
    case 2:
      return (
        <div className="fpreview__body" key={index}>
          {component.label}
        </div>
      );
    case 3:
      return (
        <label className="fpreview__field" key={index}>
          <span>{component.label}</span>
          <input placeholder="Resposta do utilizador…" disabled />
        </label>
      );
    case 4: {
      const options = component.optionsSource === 1 ? JSON.parse(component.staticOptionsJson || "[]") : null;
      return (
        <label className="fpreview__field" key={index}>
          <span>{component.label}</span>
          <div className="fpreview__dropdown">
            {options?.[0]?.title ?? "Escolhe uma opção…"} <span>⌄</span>
          </div>
        </label>
      );
    }
    case 5:
    case 6: {
      const options: { id: string; title: string }[] =
        component.optionsSource === 1 && component.staticOptionsJson
          ? JSON.parse(component.staticOptionsJson)
          : [
              { id: "1", title: "Exemplo A" },
              { id: "2", title: "Exemplo B" },
            ];
      return (
        <div className="fpreview__field" key={index}>
          <span>{component.label}</span>
          {options.slice(0, 4).map((o) => (
            <label className="fpreview__option-row" key={o.id}>
              <input type={component.type === 5 ? "checkbox" : "radio"} name={`design-preview-${index}`} disabled />{" "}
              {o.title}
            </label>
          ))}
        </div>
      );
    }
    case 7:
      return (
        <button className="fpreview__footer-button" key={index}>
          {component.footerButtonLabel}
        </button>
      );
    default:
      return null;
  }
}

export function FlowsPage() {
  const { user } = useAuth();
  const [flows, setFlows] = useState<Flow[]>([]);
  const [selectedFlowId, setSelectedFlowId] = useState<string | null>(null);
  const [isLoadingFlows, setIsLoadingFlows] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [newFlowName, setNewFlowName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDynamic, setIsDynamic] = useState(false);

  const [mode, setMode] = useState<"json" | "design">("design");
  const [jsonText, setJsonText] = useState("");
  const [screens, setScreens] = useState<EditableScreen[]>([]);
  const [selectedScreenKey, setSelectedScreenKey] = useState<string | null>(null);
  const [isLoadingContent, setIsLoadingContent] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [endpointUrl, setEndpointUrl] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<{ error: string | null; message: string | null }[]>([]);

  const [isPublishing, setIsPublishing] = useState(false);
  const [publishMessage, setPublishMessage] = useState<string | null>(null);

  const [triggerRecipient, setTriggerRecipient] = useState("");
  const [isTriggering, setIsTriggering] = useState(false);
  const [triggerMessage, setTriggerMessage] = useState<string | null>(null);

  const selectedFlow = flows.find((f) => f.id === selectedFlowId) ?? null;
  const selectedScreen = screens.find((s) => s._key === selectedScreenKey) ?? null;

  function loadFlows() {
    if (!user) return;
    setIsLoadingFlows(true);
    listFlows(user.gymId)
      .then((result) => {
        setFlows(result);
        setSelectedFlowId((current) => current ?? (result.length > 0 ? result[0].id : null));
      })
      .catch(() => {
        // Handled by the empty-state message.
      })
      .finally(() => setIsLoadingFlows(false));
  }

  useEffect(loadFlows, [user]);

  useEffect(() => {
    if (selectedFlow) {
      setIsDynamic(selectedFlow.isDynamic);
      setEndpointUrl(selectedFlow.endpointUri ?? "");
    }
  }, [selectedFlow]);

  useEffect(() => {
    if (!selectedFlowId) return;
    setIsLoadingContent(true);
    setSaveMessage(null);
    setValidationErrors([]);

    Promise.all([getFlowJson(selectedFlowId), getFlowScreens(selectedFlowId)])
      .then(([jsonResult, screensResult]) => {
        setJsonText(jsonResult.flowJson);

        const editable = screensResult.map((screen) => ({
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
        setSelectedScreenKey(editable.length > 0 ? editable[0]._key : null);
      })
      .catch(() => {
        // Handled by the empty states below.
      })
      .finally(() => setIsLoadingContent(false));
  }, [selectedFlowId]);

  async function handleCreateFlow(event: FormEvent) {
    event.preventDefault();
    setCreateError(null);
    setIsCreating(true);
    try {
      const created = await createFlow(newFlowName);
      setFlows((current) => [created, ...current]);
      setSelectedFlowId(created.id);
      setNewFlowName("");
    } catch (err) {
      setCreateError(err instanceof ApiError ? err.message : "Não foi possível criar o Flow.");
    } finally {
      setIsCreating(false);
    }
  }

  async function handleDelete(flowId: string) {
    setDeletingId(flowId);
    try {
      await deleteFlow(flowId);
      setFlows((current) => current.filter((f) => f.id !== flowId));
      if (selectedFlowId === flowId) setSelectedFlowId(null);
    } catch (err) {
      setSaveMessage(err instanceof ApiError ? err.message : "Não foi possível eliminar o Flow.");
    } finally {
      setDeletingId(null);
    }
  }

  async function handleRefresh() {
    if (!user) return;
    setIsRefreshing(true);
    try {
      setFlows(await refreshFlowStatuses(user.gymId));
    } catch {
      // Non-fatal.
    } finally {
      setIsRefreshing(false);
    }
  }

  function handleUploadClick() {
    fileInputRef.current?.click();
  }
  function handleFileSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") setJsonText(reader.result);
    };
    reader.readAsText(file);
    event.target.value = "";
  }

  // ---- Design mode editing helpers ----
  function updateScreen(key: string, updater: (s: EditableScreen) => EditableScreen) {
    setScreens((current) => current.map((s) => (s._key === key ? updater(s) : s)));
  }
  function addScreen() {
    const newScreen: EditableScreen = {
      _key: nextKey(),
      screenId: `ECRA_${String.fromCharCode(65 + (screens.length % 26))}`,
      title: `Ecrã ${screens.length + 1}`,
      components: [{ _key: nextKey(), type: 7, label: "Guardar", footerAction: 2, footerButtonLabel: "Guardar" }],
    };
    setScreens((current) => [...current, newScreen]);
    setSelectedScreenKey(newScreen._key);
  }
  function removeScreen(key: string) {
    setScreens((current) => current.filter((s) => s._key !== key));
    if (selectedScreenKey === key) setSelectedScreenKey(null);
  }
  function addComponent(screenKey: string) {
    updateScreen(screenKey, (s) => ({ ...s, components: [...s.components, { _key: nextKey(), type: 2, label: "" }] }));
  }
  function removeComponent(screenKey: string, componentKey: string) {
    updateScreen(screenKey, (s) => ({ ...s, components: s.components.filter((c) => c._key !== componentKey) }));
  }
  function updateComponent(screenKey: string, componentKey: string, patch: Partial<EditableComponent>) {
    updateScreen(screenKey, (s) => ({
      ...s,
      components: s.components.map((c) => (c._key === componentKey ? { ...c, ...patch } : c)),
    }));
  }

  async function handleSaveAll() {
    if (!selectedFlowId) return;

    if (isDynamic && !endpointUrl) {
      setSaveMessage("Este Flow está marcado como Dinâmico — define a URL do endpoint antes de gravar.");
      return;
    }

    setSaveMessage(null);
    setValidationErrors([]);

    if (mode === "design") {
      for (const screen of screens) {
        const footer = screen.components.find((c) => c.type === 7);
        if (footer?.footerAction === 1 && !footer.footerNextScreenId) {
          setSaveMessage(`O ecrã "${screen.title || screen.screenId}" tem o rodapé a "Avançar" sem destino escolhido.`);
          return;
        }

        // A Meta trunca (e avisa) labels de Dropdown/Seleção múltipla/Escolha única com mais de 20 caracteres.
        for (const component of screen.components) {
          if ((component.type === 4 || component.type === 5 || component.type === 6) && component.label.length > 20) {
            setSaveMessage(
              `O campo "${component.variableName || component.label}" no ecrã "${screen.title || screen.screenId}" tem uma pergunta com ${component.label.length} caracteres - a Meta trunca a partir de 20. Encurta o texto.`,
            );
            return;
          }
        }
      }
      if (!screens.some((s) => s.components.some((c) => c.type === 7 && c.footerAction === 2))) {
        setSaveMessage('Pelo menos um ecrã tem de terminar o Flow ("Terminar o Flow" no rodapé).');
        return;
      }
    }

    setIsSaving(true);
    try {
      if (endpointUrl) {
        await setFlowEndpoint(selectedFlowId, endpointUrl);
      }

      let result;
      if (mode === "json") {
        result = await updateFlowJson(selectedFlowId, jsonText);
      } else {
        const payload: ScreenDefinitionInput[] = screens.map((s) => ({
          screenId: s.screenId,
          title: s.title,
          components: s.components.map((c) => ({
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
        result = await saveFlowScreens(selectedFlowId, payload, isDynamic);
      }

      if (result.validationErrors?.length > 0) {
        setValidationErrors(result.validationErrors);
        setSaveMessage("Guardado, mas a Meta reportou avisos - revê abaixo.");
      } else {
        setSaveMessage("Flow guardado com sucesso!");
        setSelectedFlowId(null);
        loadFlows();
      }
    } catch (err) {
      setSaveMessage(err instanceof ApiError ? err.message : "Não foi possível guardar.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handlePublish() {
    if (!selectedFlowId) return;
    setPublishMessage(null);
    setIsPublishing(true);
    try {
      const updated = await publishFlow(selectedFlowId);
      setFlows((current) => current.map((f) => (f.id === selectedFlowId ? updated : f)));
      setPublishMessage("Flow publicado com sucesso.");
    } catch (err) {
      setPublishMessage(err instanceof ApiError ? err.message : "Não foi possível publicar.");
    } finally {
      setIsPublishing(false);
    }
  }

  async function handleTrigger() {
    if (!selectedFlowId) return;
    setTriggerMessage(null);
    setIsTriggering(true);
    try {
      await triggerFlow(selectedFlowId, {
        recipientPhoneNumber: triggerRecipient,
        bodyText: "Configura as tuas preferências de notificações num instante!",
        flowCtaButtonText: "Configurar",
      });
      setTriggerMessage("Enviado! Confirma no telemóvel do destinatário.");
    } catch (err) {
      setTriggerMessage(err instanceof ApiError ? err.message : "Não foi possível enviar.");
    } finally {
      setIsTriggering(false);
    }
  }

  const jsonPreviewScreens = (() => {
    try {
      const parsed = JSON.parse(jsonText);
      return Array.isArray(parsed.screens) ? parsed.screens : [];
    } catch {
      return [];
    }
  })();

  return (
    <div className="flows">
      <header className="flows__header">
        <h1>Flows</h1>
        <p>
          Formulários nativos do WhatsApp. Desenha por blocos ou edita o JSON diretamente - à direita vês sempre o
          resultado.
        </p>
      </header>

      <div className="flows__layout3">
        <div className="flows__list-panel">
          <form onSubmit={handleCreateFlow} className="flows__new-form">
            <input
              value={newFlowName}
              onChange={(e) => setNewFlowName(e.target.value)}
              placeholder="Nome do novo Flow"
              required
            />
            <button type="submit" disabled={isCreating}>
              {isCreating ? "…" : "+ Criar"}
            </button>
          </form>
          {createError && <div className="flows__error">{createError}</div>}

          <div className="flows__list-header">
            <h2>Flows</h2>
            <button type="button" className="flows__refresh" onClick={handleRefresh} disabled={isRefreshing}>
              {isRefreshing ? "…" : "⟳"}
            </button>
          </div>

          {isLoadingFlows && <p className="flows__empty">A carregar…</p>}
          {!isLoadingFlows && flows.length === 0 && <p className="flows__empty">Sem Flows ainda.</p>}
          {flows.map((f) => (
            <button
              key={f.id}
              type="button"
              className={`flows__flow-item${f.id === selectedFlowId ? " flows__flow-item--active" : ""}`}
              onClick={() => setSelectedFlowId(f.id)}
            >
              <span>{f.name}</span>
              <span className={`flows__status ${statusClass(f.status)}`}>{STATUS_LABELS[f.status] ?? f.status}</span>
            </button>
          ))}
        </div>

        <div className="flows__middle-panel">
          {!selectedFlow && <p className="flows__empty">Seleciona ou cria um Flow à esquerda.</p>}

          {selectedFlow && (
            <>
              <div className="flows__middle-header">
                <h2>{selectedFlow.name}</h2>
                <span className={`flows__status ${statusClass(selectedFlow.status)}`}>
                  {STATUS_LABELS[selectedFlow.status] ?? selectedFlow.status}
                </span>
                {selectedFlow.status === "Draft" && (
                  <button
                    type="button"
                    className="flows__delete-small"
                    onClick={() => handleDelete(selectedFlow.id)}
                    disabled={deletingId === selectedFlow.id}
                  >
                    {deletingId === selectedFlow.id ? "…" : "Eliminar"}
                  </button>
                )}
              </div>

              <label className="flows__dynamic-checkbox">
                <input type="checkbox" checked={isDynamic} onChange={(e) => setIsDynamic(e.target.checked)} />
                Este Flow é Dinâmico (usa dados que mudam, ex: tipos de aula do gym)
              </label>

              {isDynamic && (
                <label className="flows__endpoint-field">
                  <span>URL do Flow (endpoint de data exchange) — obrigatório para Flows Dinâmicos</span>
                  <input
                    value={endpointUrl}
                    onChange={(e) => setEndpointUrl(e.target.value)}
                    placeholder="https://xxxx.ngrok-free.dev/webhooks/whatsapp/flow-data-exchange"
                  />
                </label>
              )}

              <div className="flows__mode-switch">
                <button
                  type="button"
                  className={mode === "design" ? "flows__mode-button--active" : "flows__mode-button"}
                  onClick={() => setMode("design")}
                >
                  Desenho
                </button>
                <button
                  type="button"
                  className={mode === "json" ? "flows__mode-button--active" : "flows__mode-button"}
                  onClick={() => setMode("json")}
                >
                  JSON
                </button>
              </div>

              {isLoadingContent && <p className="flows__empty">A carregar…</p>}

              {!isLoadingContent && mode === "json" && (
                <div className="flows__json-mode">
                  <button type="button" className="flows__upload-button" onClick={handleUploadClick}>
                    Carregar de ficheiro .json
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="application/json"
                    hidden
                    onChange={handleFileSelected}
                  />
                  <textarea
                    className="flows__textarea"
                    value={jsonText}
                    onChange={(e) => setJsonText(e.target.value)}
                    spellCheck={false}
                  />
                </div>
              )}

              {!isLoadingContent && mode === "design" && (
                <div className="flows__design-mode">
                  <div className="flows__screen-tabs">
                    {screens.map((s, i) => (
                      <button
                        key={s._key}
                        type="button"
                        className={s._key === selectedScreenKey ? "flows__screen-tab--active" : "flows__screen-tab"}
                        onClick={() => setSelectedScreenKey(s._key)}
                      >
                        {i + 1}. {s.title || s.screenId}
                      </button>
                    ))}
                    <button type="button" className="flows__add-screen" onClick={addScreen}>
                      + Ecrã
                    </button>
                  </div>

                  {selectedScreen && (
                    <>
                      <div className="flows__screen-meta">
                        <label>
                          <span>ID (só letras/underscores)</span>
                          <input
                            value={selectedScreen.screenId}
                            onChange={(e) =>
                              updateScreen(selectedScreen._key, (s) => ({
                                ...s,
                                screenId: e.target.value.toUpperCase().replace(/[^A-Z_]/g, "_"),
                              }))
                            }
                          />
                        </label>
                        <label>
                          <span>Título</span>
                          <input
                            value={selectedScreen.title}
                            onChange={(e) =>
                              updateScreen(selectedScreen._key, (s) => ({ ...s, title: e.target.value }))
                            }
                          />
                        </label>
                        <button
                          type="button"
                          className="flows__delete-small"
                          onClick={() => removeScreen(selectedScreen._key)}
                        >
                          Remover ecrã
                        </button>
                      </div>

                      <div className="flows__panel-header">
                        <h3>Componentes</h3>
                        <button
                          type="button"
                          className="flows__add-button"
                          onClick={() => addComponent(selectedScreen._key)}
                        >
                          + Componente
                        </button>
                      </div>

                      {selectedScreen.components.map((component) => (
                        <div key={component._key} className="flows__component-card">
                          <div className="flows__component-header">
                            <select
                              value={component.type}
                              onChange={(e) =>
                                updateComponent(selectedScreen._key, component._key, { type: Number(e.target.value) })
                              }
                            >
                              {COMPONENT_TYPES.map((t) => (
                                <option key={t.value} value={t.value}>
                                  {t.label}
                                </option>
                              ))}
                            </select>
                            <button
                              type="button"
                              className="flows__delete-small"
                              onClick={() => removeComponent(selectedScreen._key, component._key)}
                            >
                              ✕
                            </button>
                          </div>

                          <label className="flows__component-field">
                            <span>{component.type === 7 ? "Texto do botão" : "Texto / pergunta"}</span>
                            <textarea
                              value={component.type === 7 ? (component.footerButtonLabel ?? "") : component.label}
                              onChange={(e) =>
                                component.type === 7
                                  ? updateComponent(selectedScreen._key, component._key, {
                                      footerButtonLabel: e.target.value,
                                      label: e.target.value,
                                    })
                                  : updateComponent(selectedScreen._key, component._key, { label: e.target.value })
                              }
                              rows={2}
                            />
                          </label>

                          {needsVariableName(component.type) && (
                            <label className="flows__component-field">
                              <span>Nome da variável</span>
                              <input
                                value={component.variableName ?? ""}
                                onChange={(e) =>
                                  updateComponent(selectedScreen._key, component._key, { variableName: e.target.value })
                                }
                              />
                            </label>
                          )}

                          {isOptionsComponent(component.type) && (
                            <label className="flows__component-field">
                              <span>Origem das opções</span>
                              <select
                                value={component.optionsSource ?? 1}
                                onChange={(e) =>
                                  updateComponent(selectedScreen._key, component._key, {
                                    optionsSource: Number(e.target.value),
                                  })
                                }
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
                            <label className="flows__component-field">
                              <span>Opções (id,título por linha)</span>
                              <textarea
                                value={staticOptionsToLines(component.staticOptionsJson)}
                                onChange={(e) =>
                                  updateComponent(selectedScreen._key, component._key, {
                                    staticOptionsJson: linesToStaticOptionsJson(e.target.value),
                                  })
                                }
                                rows={3}
                              />
                            </label>
                          )}

                          {component.type === 7 && (
                            <>
                              <label className="flows__component-field">
                                <span>Ação</span>
                                <select
                                  value={component.footerAction ?? 2}
                                  onChange={(e) =>
                                    updateComponent(selectedScreen._key, component._key, {
                                      footerAction: Number(e.target.value),
                                    })
                                  }
                                >
                                  {FOOTER_ACTIONS.map((a) => (
                                    <option key={a.value} value={a.value}>
                                      {a.label}
                                    </option>
                                  ))}
                                </select>
                              </label>
                              {component.footerAction === 1 && (
                                <label className="flows__component-field">
                                  <span>Próximo ecrã</span>
                                  <select
                                    value={component.footerNextScreenId ?? ""}
                                    onChange={(e) =>
                                      updateComponent(selectedScreen._key, component._key, {
                                        footerNextScreenId: e.target.value,
                                      })
                                    }
                                  >
                                    <option value="">Escolhe…</option>
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
              )}

              <button type="button" className="flows__save-all" onClick={handleSaveAll} disabled={isSaving}>
                {isSaving ? "A guardar…" : "Guardar"}
              </button>
              {validationErrors.length > 0 && (
                <div className="flows__validation-errors">
                  {validationErrors.map((e, i) => (
                    <div key={i}>
                      {e.error ? `${e.error}: ` : ""}
                      {e.message}
                    </div>
                  ))}
                </div>
              )}

              {selectedFlow.status === "Draft" && (
                <button type="button" className="flows__publish-button" onClick={handlePublish} disabled={isPublishing}>
                  {isPublishing ? "A publicar…" : "Publicar Flow"}
                </button>
              )}
              {publishMessage && <div className="flows__message">{publishMessage}</div>}

              {selectedFlow.status === "Published" && (
                <div className="flows__trigger">
                  <input
                    value={triggerRecipient}
                    onChange={(e) => setTriggerRecipient(e.target.value)}
                    placeholder="Número de teste"
                  />
                  <button
                    type="button"
                    className="flows__save-all"
                    onClick={handleTrigger}
                    disabled={isTriggering || !triggerRecipient}
                  >
                    {isTriggering ? "…" : "Testar"}
                  </button>
                </div>
              )}
              {triggerMessage && <div className="flows__message">{triggerMessage}</div>}
            </>
          )}
          {saveMessage && <div className="flows__message flows__message--top">{saveMessage}</div>}
        </div>

        <div className="flows__preview-panel">
          <h2>Pré-visualização</h2>
          <div className="flows__phone">
            {mode === "json" && jsonPreviewScreens.length === 0 && (
              <p className="flows__empty">JSON inválido ou sem ecrãs.</p>
            )}
            {mode === "json" &&
              jsonPreviewScreens[0]?.layout?.children?.map(
                (c: { type?: string; text?: string; label?: string }, i: number) => {
                  switch (c.type) {
                    case "TextHeading":
                      return (
                        <div className="fpreview__heading" key={i}>
                          {c.text}
                        </div>
                      );
                    case "TextBody":
                      return (
                        <div className="fpreview__body" key={i}>
                          {c.text}
                        </div>
                      );
                    case "Footer":
                      return (
                        <button className="fpreview__footer-button" key={i}>
                          {c.label}
                        </button>
                      );
                    default:
                      return (
                        <label className="fpreview__field" key={i}>
                          <span>{c.label}</span>
                          <div className="fpreview__dropdown">…</div>
                        </label>
                      );
                  }
                },
              )}

            {mode === "design" && !selectedScreen && <p className="flows__empty">Sem ecrã selecionado.</p>}
            {mode === "design" && selectedScreen?.components.map((c, i) => renderDesignPreview(c, i))}
          </div>
        </div>
      </div>
    </div>
  );
}

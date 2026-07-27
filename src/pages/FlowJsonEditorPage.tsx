import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../auth/useAuth';
import { getFlowJson, listFlows, updateFlowJson, type Flow } from '../api/flows';
import { ApiError } from '../api/client';
import './FlowJsonEditorPage.css';

interface JsonComponent {
  type?: string;
  text?: string;
  label?: string;
  name?: string;
  ['data-source']?: unknown;
  ['on-click-action']?: { name?: string };
}

interface JsonScreen {
  id?: string;
  title?: string;
  layout?: { children?: JsonComponent[] };
}

function extractScreens(json: string): JsonScreen[] {
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed.screens) ? parsed.screens : [];
  } catch {
    return [];
  }
}

function staticOptionLabels(dataSource: unknown): string[] | null {
  if (Array.isArray(dataSource)) {
    return dataSource.map((o) => (typeof o === 'object' && o !== null && 'title' in o ? String((o as { title: unknown }).title) : String(o)));
  }
  return null;
}

function renderPreviewComponent(component: JsonComponent, index: number) {
  switch (component.type) {
    case 'TextHeading':
      return (
        <div className="jpreview__heading" key={index}>
          {component.text}
        </div>
      );
    case 'TextBody':
      return (
        <div className="jpreview__body" key={index}>
          {component.text}
        </div>
      );
    case 'TextInput':
      return (
        <label className="jpreview__field" key={index}>
          <span>{component.label}</span>
          <input placeholder="Resposta do utilizador…" disabled />
        </label>
      );
    case 'Dropdown': {
      const options = staticOptionLabels(component['data-source']);
      return (
        <label className="jpreview__field" key={index}>
          <span>{component.label}</span>
          <div className="jpreview__dropdown">
            {options ? options[0] : 'Escolhe uma opção…'} <span className="jpreview__chevron">⌄</span>
          </div>
        </label>
      );
    }
    case 'CheckboxGroup':
    case 'RadioButtonsGroup': {
      const options = staticOptionLabels(component['data-source']) ?? ['Exemplo A', 'Exemplo B', 'Exemplo C'];
      const inputType = component.type === 'CheckboxGroup' ? 'checkbox' : 'radio';
      return (
        <div className="jpreview__field" key={index}>
          <span>{component.label}</span>
          {options.slice(0, 4).map((option, i) => (
            <label className="jpreview__option-row" key={i}>
              <input type={inputType} name={`preview-${index}`} disabled /> {option}
            </label>
          ))}
        </div>
      );
    }
    case 'Footer':
      return (
        <button className="jpreview__footer-button" key={index}>
          {component.label}
        </button>
      );
    default:
      return null;
  }
}

export function FlowJsonEditorPage() {
  const { user } = useAuth();
  const [flows, setFlows] = useState<Flow[]>([]);
  const [selectedFlowId, setSelectedFlowId] = useState<string | null>(null);
  const [jsonText, setJsonText] = useState('');
  const [isLoadingFlows, setIsLoadingFlows] = useState(true);
  const [isLoadingJson, setIsLoadingJson] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<{ error: string | null; message: string | null }[]>([]);
  const [selectedScreenIndex, setSelectedScreenIndex] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    listFlows(user.gymId)
      .then((result) => {
        setFlows(result);
        if (result.length > 0) setSelectedFlowId(result[0].id);
      })
      .catch(() => {
        // Handled by the empty-state message below.
      })
      .finally(() => setIsLoadingFlows(false));
  }, [user]);

  useEffect(() => {
    if (!selectedFlowId) return;
    setIsLoadingJson(true);
    setSaveMessage(null);
    setValidationErrors([]);
    setSelectedScreenIndex(0);

    getFlowJson(selectedFlowId)
      .then((result) => setJsonText(result.flowJson))
      .catch(() => setJsonText(''))
      .finally(() => setIsLoadingJson(false));
  }, [selectedFlowId]);

  function handleUploadClick() {
    fileInputRef.current?.click();
  }

  function handleFileSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') setJsonText(reader.result);
    };
    reader.readAsText(file);
    event.target.value = '';
  }

  async function handleSave() {
    if (!selectedFlowId) return;
    setSaveMessage(null);
    setValidationErrors([]);
    setIsSaving(true);

    try {
      const result = await updateFlowJson(selectedFlowId, jsonText);
      if (result.validationErrors?.length > 0) {
        setValidationErrors(result.validationErrors);
        setSaveMessage('Guardado, mas a Meta reportou avisos de validação - revê abaixo.');
      } else {
        setSaveMessage('JSON guardado e enviado para a Meta com sucesso.');
      }
    } catch (err) {
      setSaveMessage(err instanceof ApiError ? err.message : 'Não foi possível guardar o JSON.');
    } finally {
      setIsSaving(false);
    }
  }

  const screens = extractScreens(jsonText);
  const selectedScreen = screens[selectedScreenIndex];

  return (
    <div className="jeditor">
      <header className="jeditor__header">
        <h1>Editor de JSON</h1>
        <p>Edita o Flow JSON diretamente, ou carrega de um ficheiro .json - com pré-visualização em tempo real à direita.</p>
      </header>

      <div className="jeditor__layout">
        <div className="jeditor__flow-list">
          <h2>Flows</h2>
          {isLoadingFlows && <p className="jeditor__empty">A carregar…</p>}
          {!isLoadingFlows && flows.length === 0 && <p className="jeditor__empty">Sem Flows ainda.</p>}
          {flows.map((flow) => (
            <button
              key={flow.id}
              type="button"
              className={`jeditor__flow-item${flow.id === selectedFlowId ? ' jeditor__flow-item--active' : ''}`}
              onClick={() => setSelectedFlowId(flow.id)}
            >
              {flow.name}
            </button>
          ))}
        </div>

        <div className="jeditor__json-panel">
          <div className="jeditor__json-toolbar">
            <button type="button" className="jeditor__upload-button" onClick={handleUploadClick}>
              Carregar de ficheiro .json
            </button>
            <input ref={fileInputRef} type="file" accept="application/json" hidden onChange={handleFileSelected} />
            <button type="button" className="jeditor__save-button" onClick={handleSave} disabled={isSaving || !selectedFlowId}>
              {isSaving ? 'A guardar…' : 'Guardar'}
            </button>
          </div>

          {saveMessage && <div className="jeditor__message">{saveMessage}</div>}
          {validationErrors.length > 0 && (
            <div className="jeditor__validation-errors">
              {validationErrors.map((e, i) => (
                <div key={i}>
                  {e.error ? `${e.error}: ` : ''}
                  {e.message}
                </div>
              ))}
            </div>
          )}

          {isLoadingJson ? (
            <p className="jeditor__empty">A carregar…</p>
          ) : (
            <textarea className="jeditor__textarea" value={jsonText} onChange={(e) => setJsonText(e.target.value)} spellCheck={false} />
          )}
        </div>

        <div className="jeditor__preview-panel">
          <h2>Pré-visualização</h2>
          {screens.length > 1 && (
            <select className="jeditor__screen-select" value={selectedScreenIndex} onChange={(e) => setSelectedScreenIndex(Number(e.target.value))}>
              {screens.map((s, i) => (
                <option key={i} value={i}>
                  {s.title || s.id || `Ecrã ${i + 1}`}
                </option>
              ))}
            </select>
          )}
          <div className="jeditor__phone">
            {!selectedScreen && <p className="jeditor__empty">JSON inválido ou sem ecrãs.</p>}
            {selectedScreen?.layout?.children?.map((component, index) => renderPreviewComponent(component, index))}
          </div>
        </div>
      </div>
    </div>
  );
}

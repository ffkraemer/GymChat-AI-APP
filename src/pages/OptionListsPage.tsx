import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "../auth/useAuth";
import {
  createOptionList,
  deleteOptionList,
  listOptionLists,
  setOptionListActive,
  updateOptionList,
  type OptionItem,
  type OptionList,
} from "../api/optionLists";
import { ApiError } from "../api/client";
import { StatusBanner } from "../components/StatusBanner";
import { useStatusMessage } from "../components/useStatusMessage";
import "./OptionListsPage.css";

// Editable row in the items editor - carries a client key so React can track rows across edits.
interface EditableItem extends OptionItem {
  _key: string;
}

let keyCounter = 0;
function nextKey(): string {
  keyCounter += 1;
  return `oi${keyCounter}`;
}

// Turns "Perder peso" into a stable-ish machine value ("perder_peso") for new items - the admin
// can override it. Only used to seed the value field; system-list values are never regenerated.
function slugifyValue(label: string): string {
  return label
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function OptionListsPage() {
  const { user } = useAuth();
  const [lists, setLists] = useState<OptionList[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [name, setName] = useState("");
  const [items, setItems] = useState<EditableItem[]>([]);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const pageStatus = useStatusMessage();

  const selected = lists.find((l) => l.id === selectedId) ?? null;
  const isSystem = selected?.isSystem ?? false;
  const isPlatformAdmin = user?.roles.includes("PlatformAdmin") ?? false;
  // A gym admin can't edit a global list (only a PlatformAdmin can). We surface this read-only.
  const isGlobalAndNotOwned = (selected?.isGlobal ?? false) && !isPlatformAdmin;
  const readOnly = isGlobalAndNotOwned;

  function loadLists() {
    if (!user) return;
    setIsLoading(true);
    listOptionLists(user.gymId, true)
      .then((result) => {
        setLists(result);
      })
      .catch(() => pageStatus.showError("Não foi possível carregar as listas de opções."))
      .finally(() => setIsLoading(false));
  }

  useEffect(loadLists, [user]);

  // When the selected list changes, load its content into the editor.
  useEffect(() => {
    if (isCreatingNew) return;
    if (!selected) {
      setName("");
      setItems([]);
      return;
    }
    setName(selected.name);
    setItems(selected.items.map((i) => ({ ...i, _key: nextKey() })));
  }, [selectedId, isCreatingNew, selected]);

  function startNew() {
    setIsCreatingNew(true);
    setSelectedId(null);
    setName("");
    setItems([{ _key: nextKey(), value: "", label: "", order: 0 }]);
    pageStatus.clear();
  }

  function selectList(id: string) {
    setIsCreatingNew(false);
    setSelectedId(id);
    pageStatus.clear();
  }

  function addItem() {
    setItems((current) => [...current, { _key: nextKey(), value: "", label: "", order: current.length }]);
  }

  function removeItem(key: string) {
    setItems((current) => current.filter((i) => i._key !== key));
  }

  function updateItem(key: string, patch: Partial<EditableItem>) {
    setItems((current) => current.map((i) => (i._key === key ? { ...i, ...patch } : i)));
  }

  function moveItem(key: string, direction: -1 | 1) {
    setItems((current) => {
      const index = current.findIndex((i) => i._key === key);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= current.length) return current;
      const copy = [...current];
      [copy[index], copy[target]] = [copy[target], copy[index]];
      return copy;
    });
  }

  async function handleSave(event: FormEvent) {
    event.preventDefault();
    if (readOnly) return;
    pageStatus.clear();

    const trimmedName = name.trim();
    if (!trimmedName) {
      pageStatus.showWarning("Dá um nome à lista.");
      return;
    }

    const cleanedItems = items
      .map((i, idx) => ({ value: i.value.trim(), label: i.label.trim(), order: idx }))
      .filter((i) => i.label.length > 0);

    if (cleanedItems.length === 0) {
      pageStatus.showWarning("A lista precisa de pelo menos uma opção com texto.");
      return;
    }

    // For non-system lists, auto-fill a missing value from the label.
    for (const item of cleanedItems) {
      if (!item.value) item.value = slugifyValue(item.label);
    }

    const values = cleanedItems.map((i) => i.value);
    if (new Set(values).size !== values.length) {
      pageStatus.showWarning("Há valores repetidos nas opções - cada valor tem de ser único.");
      return;
    }

    setIsSaving(true);
    try {
      if (isCreatingNew) {
        const created = await createOptionList({ name: trimmedName, items: cleanedItems });
        pageStatus.showSuccess("Lista criada com sucesso!");
        setIsCreatingNew(false);
        loadLists();
        setSelectedId(created.id);
      } else if (selected) {
        await updateOptionList(selected.id, trimmedName, cleanedItems);
        pageStatus.showSuccess("Lista atualizada com sucesso!");
        loadLists();
      }
    } catch (err) {
      pageStatus.showError(err instanceof ApiError ? err.message : "Não foi possível guardar a lista.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleToggleActive(list: OptionList) {
    setTogglingId(list.id);
    pageStatus.clear();
    try {
      await setOptionListActive(list.id, !list.isActive);
      loadLists();
    } catch (err) {
      pageStatus.showError(err instanceof ApiError ? err.message : "Não foi possível alterar o estado da lista.");
    } finally {
      setTogglingId(null);
    }
  }

  async function handleDelete(list: OptionList) {
    pageStatus.clear();
    try {
      await deleteOptionList(list.id);
      if (selectedId === list.id) setSelectedId(null);
      loadLists();
    } catch (err) {
      pageStatus.showError(err instanceof ApiError ? err.message : "Não foi possível eliminar a lista.");
    }
  }

  const showEditor = isCreatingNew || selected !== null;

  return (
    <div className="option-lists">
      <header className="option-lists__header">
        <h1>Listas de Opções</h1>
        <p>
          Listas reutilizáveis para usares nos Flows (ex: "Objetivos", "Níveis"). Cria as tuas ou usa as listas do
          sistema. As listas globais aparecem em todos os gyms.
        </p>
      </header>

      {pageStatus.status && (
        <StatusBanner variant={pageStatus.status.variant} message={pageStatus.status.message} onDismiss={pageStatus.clear} />
      )}

      <div className="option-lists__layout">
        <div className="option-lists__list-panel">
          <button type="button" className="option-lists__new-button" onClick={startNew}>
            + Nova lista
          </button>

          {isLoading && <p className="option-lists__empty">A carregar…</p>}
          {!isLoading && lists.length === 0 && <p className="option-lists__empty">Sem listas ainda.</p>}

          {lists.map((list) => (
            <button
              key={list.id}
              type="button"
              className={`option-lists__item${list.id === selectedId ? " option-lists__item--active" : ""}${
                !list.isActive ? " option-lists__item--inactive" : ""
              }`}
              onClick={() => selectList(list.id)}
            >
              <span className="option-lists__item-name">{list.name}</span>
              <span className="option-lists__badges">
                {list.isGlobal && <span className="option-lists__badge option-lists__badge--global">Global</span>}
                {list.isSystem && <span className="option-lists__badge option-lists__badge--system">Sistema</span>}
                {!list.isActive && <span className="option-lists__badge option-lists__badge--inactive">Inativa</span>}
              </span>
            </button>
          ))}
        </div>

        <div className="option-lists__editor-panel">
          {!showEditor && <p className="option-lists__empty">Seleciona uma lista à esquerda, ou cria uma nova.</p>}

          {showEditor && (
            <form onSubmit={handleSave}>
              <div className="option-lists__editor-header">
                <h2>{isCreatingNew ? "Nova lista" : selected?.name}</h2>
                {isSystem && (
                  <span className="option-lists__hint">
                    Lista de sistema — podes renomear e reordenar as opções, mas não alterar os seus valores técnicos.
                  </span>
                )}
                {readOnly && (
                  <span className="option-lists__hint">
                    Lista global — só um administrador da plataforma a pode editar. Aqui é só consulta.
                  </span>
                )}
              </div>

              <label className="option-lists__field">
                <span>Nome da lista</span>
                <input value={name} onChange={(e) => setName(e.target.value)} disabled={readOnly} required />
              </label>

              <div className="option-lists__items-header">
                <h3>Opções</h3>
                {!readOnly && !isSystem && (
                  <button type="button" className="option-lists__add-item" onClick={addItem}>
                    + Opção
                  </button>
                )}
              </div>

              <div className="option-lists__items">
                <div className="option-lists__items-labels">
                  <span>Valor (técnico)</span>
                  <span>Texto visível</span>
                  <span></span>
                </div>
                {items.map((item, index) => (
                  <div key={item._key} className="option-lists__item-row">
                    <input
                      className="option-lists__value-input"
                      value={item.value}
                      onChange={(e) => updateItem(item._key, { value: e.target.value })}
                      placeholder="ex: lose_weight"
                      disabled={readOnly || isSystem}
                    />
                    <input
                      className="option-lists__label-input"
                      value={item.label}
                      onChange={(e) => updateItem(item._key, { label: e.target.value })}
                      placeholder="ex: Perder peso"
                      disabled={readOnly}
                    />
                    <div className="option-lists__item-actions">
                      <button
                        type="button"
                        onClick={() => moveItem(item._key, -1)}
                        disabled={readOnly || index === 0}
                        title="Subir"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        onClick={() => moveItem(item._key, 1)}
                        disabled={readOnly || index === items.length - 1}
                        title="Descer"
                      >
                        ↓
                      </button>
                      {!isSystem && (
                        <button
                          type="button"
                          className="option-lists__remove-item"
                          onClick={() => removeItem(item._key)}
                          disabled={readOnly}
                          title="Remover"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {!readOnly && (
                <div className="option-lists__editor-actions">
                  <button type="submit" className="option-lists__save-button" disabled={isSaving}>
                    {isSaving ? "A guardar…" : isCreatingNew ? "Criar lista" : "Guardar alterações"}
                  </button>

                  {!isCreatingNew && selected && !isSystem && (
                    <>
                      <button
                        type="button"
                        className="option-lists__toggle-button"
                        onClick={() => handleToggleActive(selected)}
                        disabled={togglingId === selected.id}
                      >
                        {selected.isActive ? "Desativar" : "Reativar"}
                      </button>
                      <button
                        type="button"
                        className="option-lists__delete-button"
                        onClick={() => handleDelete(selected)}
                      >
                        Eliminar
                      </button>
                    </>
                  )}
                </div>
              )}
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

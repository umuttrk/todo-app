import { useEffect, useState, FormEvent } from 'react';
import {
  ApiError,
  createTask,
  deleteTask,
  listTags,
  listTasks,
  permanentlyDeleteTask,
  reorderTasks,
  restoreTask,
  updateTask,
} from './api';
import TaskList from './components/TaskList';
import { useTheme } from './useTheme';
import type { Tag, Task, TaskView } from './types';

const VIEWS: { id: TaskView; label: string }[] = [
  { id: 'active', label: 'Aktif' },
  { id: 'completed', label: 'Tamamlananlar' },
  { id: 'trash', label: 'Çöp Kutusu' },
];

const SEARCH_DEBOUNCE_MS = 250;

function readViewFromUrl(): TaskView {
  const raw = new URLSearchParams(window.location.search).get('view');
  return raw === 'completed' || raw === 'trash' ? raw : 'active';
}

// docs/specs/002-uygulama-kabugu.md (App Shell) ve
// docs/specs/003-gorev-listesi.md (Görev Listesi) implementasyonu.
export default function App() {
  const { resolved: theme, toggle: toggleTheme } = useTheme();
  const [view, setView] = useState<TaskView>(readViewFromUrl);
  const [searchInput, setSearchInput] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [tagMenuOpen, setTagMenuOpen] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [quickAddTitle, setQuickAddTitle] = useState('');
  const [quickAddError, setQuickAddError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    function onPopState() {
      setView(readViewFromUrl());
    }
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => {
    listTags().then(setAllTags).catch(() => setAllTags([]));
  }, []);

  useEffect(() => {
    const handle = setTimeout(() => setDebouncedQuery(searchInput.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [searchInput]);

  useEffect(() => {
    refreshTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, debouncedQuery, selectedTags]);

  function refreshTasks() {
    listTasks({ view, q: debouncedQuery || undefined, tags: selectedTags })
      .then(setTasks)
      .catch(() => setTasks([]));
  }

  function selectView(next: TaskView) {
    setView(next);
    const params = new URLSearchParams(window.location.search);
    params.set('view', next);
    window.history.pushState({}, '', `?${params.toString()}`);
  }

  function toggleTagFilter(name: string) {
    setSelectedTags((prev) =>
      prev.includes(name) ? prev.filter((t) => t !== name) : [...prev, name],
    );
  }

  async function handleQuickAdd(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setQuickAddError(null);
    setSubmitting(true);
    try {
      await createTask(quickAddTitle);
      setQuickAddTitle('');
      refreshTasks();
    } catch (err) {
      setQuickAddError(err instanceof ApiError ? (err.fields?.title ?? err.message) : 'Görev oluşturulamadı.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggleCompleted(task: Task) {
    setTasks((prev) => prev.filter((t) => t.id !== task.id));
    await updateTask(task.id, { completed: !task.completed });
    refreshTasks();
  }

  async function handleDelete(task: Task) {
    setTasks((prev) => prev.filter((t) => t.id !== task.id));
    await deleteTask(task.id);
    refreshTasks();
  }

  async function handleRestore(task: Task) {
    setTasks((prev) => prev.filter((t) => t.id !== task.id));
    await restoreTask(task.id);
    refreshTasks();
  }

  async function handlePermanentDelete(task: Task) {
    // docs/specs/003-gorev-listesi.md §6 — geri dönüşsüz işlem, onay zorunlu
    if (!window.confirm(`"${task.title}" kalıcı olarak silinsin mi? Bu işlem geri alınamaz.`)) {
      return;
    }
    setTasks((prev) => prev.filter((t) => t.id !== task.id));
    await permanentlyDeleteTask(task.id);
    refreshTasks();
  }

  function handleReorder(taskId: string, newOrder: number) {
    setTasks((prev) =>
      [...prev]
        .map((t) => (t.id === taskId ? { ...t, order: newOrder } : t))
        .sort((a, b) => a.order - b.order),
    );
    reorderTasks([{ id: taskId, order: newOrder }]).catch(() => refreshTasks());
  }

  const hasActiveFilter = debouncedQuery.length > 0 || selectedTags.length > 0;

  return (
    <div className="shell">
      <header className="topbar">
        <h1 className="wordmark">Todo</h1>
        <div className="topbar-controls">
          <input
            type="search"
            className="search-input"
            placeholder="Ara…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            aria-label="Görevlerde ara"
          />
          <div className="tag-filter">
            <button
              type="button"
              className="tag-filter-button"
              onClick={() => setTagMenuOpen((o) => !o)}
              aria-expanded={tagMenuOpen}
            >
              etiket ▾{selectedTags.length > 0 ? ` (${selectedTags.length})` : ''}
            </button>
            {tagMenuOpen && (
              <div className="tag-filter-menu">
                {allTags.length === 0 && <p className="tag-filter-empty">Henüz etiket yok.</p>}
                {allTags.map((tag) => (
                  <label key={tag.id}>
                    <input
                      type="checkbox"
                      checked={selectedTags.includes(tag.name)}
                      onChange={() => toggleTagFilter(tag.name)}
                    />
                    #{tag.name}
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>
        <button
          type="button"
          className="theme-toggle"
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Aydınlık moda geç' : 'Karanlık moda geç'}
          aria-label={theme === 'dark' ? 'Aydınlık moda geç' : 'Karanlık moda geç'}
        >
          {theme === 'dark' ? '☾' : '☀'}
        </button>
      </header>

      <nav className="tab-strip" role="tablist">
        {VIEWS.map((v) => (
          <button
            key={v.id}
            role="tab"
            className="tab"
            aria-selected={view === v.id}
            onClick={() => selectView(v.id)}
          >
            {v.label}
          </button>
        ))}
      </nav>

      <main className="content">
        {view === 'active' && (
          <form className="quick-add" onSubmit={handleQuickAdd}>
            <input
              type="text"
              value={quickAddTitle}
              onChange={(e) => setQuickAddTitle(e.target.value)}
              placeholder="Ne yapılacak?"
              disabled={submitting}
              aria-label="Yeni görev başlığı"
            />
            <button type="submit" disabled={submitting}>
              {submitting ? 'Ekleniyor…' : 'Ekle'}
            </button>
          </form>
        )}
        {quickAddError && <p className="field-error">{quickAddError}</p>}

        <TaskList
          view={view}
          tasks={tasks}
          hasActiveFilter={hasActiveFilter}
          onToggleCompleted={handleToggleCompleted}
          onDelete={handleDelete}
          onRestore={handleRestore}
          onPermanentDelete={handlePermanentDelete}
          onReorder={handleReorder}
        />
      </main>
    </div>
  );
}

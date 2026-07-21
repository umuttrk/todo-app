import { useState, FormEvent } from 'react';
import { createTask, ApiError } from './api';
import type { Task } from './types';

// Bu ekran sadece docs/specs/001-todo-olustur.md kapsamındaki
// "görev oluştur" özelliğini kapsar. Backend'de henüz bir listeleme
// (GET) endpoint'i yok, bu yüzden aşağıdaki liste sadece bu oturumda
// oluşturulan görevleri gösterir — sayfa yenilenince kaybolur.
export default function App() {
  const [title, setTitle] = useState('');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFieldError(null);
    setFormError(null);
    setSubmitting(true);

    try {
      const task = await createTask(title);
      setTasks((prev) => [task, ...prev]);
      setTitle('');
    } catch (err) {
      if (err instanceof ApiError) {
        setFieldError(err.fields?.title ?? null);
        if (!err.fields?.title) {
          setFormError(err.message);
        }
      } else {
        setFormError('Görev oluşturulamadı. API çalışıyor mu?');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="page">
      <h1>Todo App</h1>

      <form className="create-form" onSubmit={handleSubmit}>
        <label htmlFor="title">Yeni görev</label>
        <div className="create-form-row">
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ne yapılacak?"
            disabled={submitting}
          />
          <button type="submit" disabled={submitting}>
            {submitting ? 'Ekleniyor…' : 'Ekle'}
          </button>
        </div>
        {fieldError && <p className="error-text">{fieldError}</p>}
        {formError && <p className="error-text">{formError}</p>}
      </form>

      <ul className="task-list">
        {tasks.length === 0 && (
          <li className="empty-state">Henüz bu oturumda görev eklenmedi.</li>
        )}
        {tasks.map((task) => (
          <li key={task.id} className="task-item">
            <span className="task-title">{task.title}</span>
            <span className="task-priority">{task.priority}</span>
          </li>
        ))}
      </ul>

      <p className="session-note">
        Not: liste sadece bu oturuma ait — sayfayı yenilersen kaybolur
        (backend'de henüz görevleri listeleyen bir endpoint yok).
      </p>
    </main>
  );
}

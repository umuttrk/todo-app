// docs/PRD.md §5 (Veri Modeli) ile birebir uyumlu şekiller.
// src/api ile kod paylaşımı yok (ayrı süreçler, docs/ARCHITECTURE.md),
// bu yüzden tipler burada bağımsız olarak tanımlanıyor.
export interface Subtask {
  id: string;
  taskId: string;
  title: string;
  completed: boolean;
  order: number;
}

export interface Tag {
  id: string;
  name: string;
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
  dueDate: string | null;
  order: number;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
  subtasks: Subtask[];
  tags: Tag[];
}

export type TaskView = 'active' | 'completed' | 'trash';

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    fields?: Record<string, string>;
  };
}

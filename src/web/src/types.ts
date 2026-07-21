// docs/PRD.md §5 (Veri Modeli) ile birebir uyumlu Task şekli.
// src/api ile kod paylaşımı yok (ayrı süreçler, docs/ARCHITECTURE.md),
// bu yüzden tip burada bağımsız olarak tanımlanıyor.
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
}

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    fields?: Record<string, string>;
  };
}

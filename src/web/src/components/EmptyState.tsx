interface EmptyStateProps {
  title: string;
  message: string;
}

// docs/specs/002-uygulama-kabugu.md — Boş Durumlar
export default function EmptyState({ title, message }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <h2>{title}</h2>
      <p>{message}</p>
    </div>
  );
}

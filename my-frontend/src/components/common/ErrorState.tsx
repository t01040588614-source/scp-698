interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

export default function ErrorState({
  title = "데이터를 불러오지 못했습니다.",
  message = "잠시 후 다시 시도해주세요.",
  onRetry,
}: ErrorStateProps) {
  return (
    <section className="error-state" role="alert">
      <h3>{title}</h3>
      <p>{message}</p>
      {onRetry && (
        <button type="button" className="btn-primary" onClick={onRetry}>
          다시 시도
        </button>
      )}
    </section>
  );
}

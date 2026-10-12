type LiveStreamBadgeProps = {
  connected: boolean;
  className?: string;
  /** false면 끊김 상태 배지 숨김 */
  showOffline?: boolean;
};

export default function LiveStreamBadge({
  connected,
  className = "",
  showOffline = false,
}: LiveStreamBadgeProps) {
  if (connected) {
    return (
      <span
        className={`inv-live-badge is-on ${className}`.trim()}
        title="WebSocket 스트림 연결됨"
      >
        실시간
      </span>
    );
  }
  if (!showOffline) return null;
  return (
    <span
      className={`inv-live-badge is-off ${className}`.trim()}
      title="WebSocket 재연결 중 — REST 폴링으로 표시"
    >
      연결 대기
    </span>
  );
}

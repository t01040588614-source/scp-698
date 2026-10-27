type LiveStreamBadgeProps = {
  connected: boolean;
  className?: string;
  /** false면 끊김 상태 배지 숨김 */
  showOffline?: boolean;
  /** HTS 틱이 아닌 준실시간(캐시 WS) 고지 */
  quasiRealtime?: boolean;
};

export default function LiveStreamBadge({
  connected,
  className = "",
  showOffline = false,
  quasiRealtime = true,
}: LiveStreamBadgeProps) {
  if (connected) {
    const label = quasiRealtime ? "준실시간" : "실시간";
    const title = quasiRealtime
      ? "시세 캐시 + WebSocket 푸시 (HTS 체결 틱 아님)"
      : "WebSocket 스트림 연결됨";
    return (
      <span
        className={`inv-live-badge is-on ${className}`.trim()}
        title={title}
      >
        {label}
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

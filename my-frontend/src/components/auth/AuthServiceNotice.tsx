import SystemStatusLink from "@/components/navigation/SystemStatusLink";
import { authUi } from "@/content/authUi";

/** 메인 앱 `AppHighlightBar`와 같은 톤의 인증 화면 안내 띠 */
export default function AuthServiceNotice() {
  const link = authUi.aside.systemLink;
  return (
    <div className="auth-lens-notice" role="note">
      <span className="auth-lens-notice-text">{link.message}</span>
      <SystemStatusLink href={link.href}>{link.linkLabel}</SystemStatusLink>
    </div>
  );
}

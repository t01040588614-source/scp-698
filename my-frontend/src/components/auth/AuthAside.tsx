import Link from "next/link";
import { Activity, BarChart2, Radio } from "lucide-react";
import AppLogo from "@/components/layout/AppLogo";
import { authUi } from "@/content/authUi";

const FEATURE_ICONS = [Radio, BarChart2, Activity] as const;

export default function AuthAside() {
  const { aside } = authUi;

  return (
    <aside className="auth-register-aside">
      <div className="auth-register-aside-accent" aria-hidden />
      <div className="auth-register-aside-inner">
        <AppLogo className="auth-register-logo" variant="onBrand" />
        <p className="auth-register-tagline">{authUi.tagline}</p>
        <h2 className="auth-register-headline">{aside.headline}</h2>
        <p className="auth-register-subhead">{aside.subhead}</p>
        <ul className="auth-register-features">
          {aside.features.map((text, i) => {
            const Icon = FEATURE_ICONS[i] ?? Activity;
            return (
              <li key={text}>
                <span className="auth-register-feature-icon-wrap" aria-hidden>
                  <Icon className="auth-register-feature-icon" />
                </span>
                {text}
              </li>
            );
          })}
        </ul>
        <Link href={aside.systemLink.href} className="auth-register-aside-link">
          {aside.systemLink.linkLabel} →
        </Link>
        <div className="auth-register-disclaimer">
          <p className="auth-register-disclaimer-title">{aside.disclaimerTitle}</p>
          <p>{aside.disclaimerBody}</p>
        </div>
      </div>
    </aside>
  );
}

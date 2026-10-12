export type PasswordStrength = "weak" | "fair" | "good" | "strong";

export function assessPasswordStrength(password: string): {
  level: PasswordStrength;
  score: number;
  label: string;
  checks: { label: string; ok: boolean }[];
} {
  const checks = [
    { label: "8자 이상", ok: password.length >= 8 },
    { label: "영문 포함", ok: /[a-zA-Z]/.test(password) },
    { label: "숫자 포함", ok: /\d/.test(password) },
    { label: "특수문자 포함", ok: /[^a-zA-Z0-9]/.test(password) },
  ];
  const score = checks.filter((c) => c.ok).length;
  let level: PasswordStrength = "weak";
  let label = "약함";
  if (score >= 4) {
    level = "strong";
    label = "강함";
  } else if (score >= 3) {
    level = "good";
    label = "양호";
  } else if (score >= 2) {
    level = "fair";
    label = "보통";
  }
  return { level, score, label, checks };
}

export function isPasswordAcceptable(password: string): boolean {
  const { score } = assessPasswordStrength(password);
  return password.length >= 8 && score >= 3;
}

const USERNAME_RE = /^[a-zA-Z0-9_]{4,20}$/;

export function validateUsername(username: string): string | null {
  const s = username.trim();
  if (s.length < 4) return "사용자명은 4자 이상이어야 합니다.";
  if (s.length > 20) return "사용자명은 20자 이하입니다.";
  if (!USERNAME_RE.test(s)) return "영문, 숫자, 밑줄(_)만 사용할 수 있습니다.";
  return null;
}

export function validateEmail(email: string): string | null {
  const s = email.trim();
  if (!s) return "이메일을 입력하세요.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) return "올바른 이메일 형식이 아닙니다.";
  return null;
}

export function validateFullName(name: string): string | null {
  const s = name.trim();
  if (s.length < 2) return "이름을 2자 이상 입력하세요.";
  if (s.length > 40) return "이름은 40자 이하입니다.";
  return null;
}

export function normalizePhoneDigits(raw: string): string {
  let digits = raw.replace(/\D/g, "");
  if (digits.startsWith("82") && digits.length >= 10) {
    digits = `0${digits.slice(2)}`;
  }
  return digits;
}

export function formatPhoneDisplay(raw: string): string {
  const d = normalizePhoneDigits(raw);
  if (d.length <= 3) return d;
  if (d.length <= 7) return `${d.slice(0, 3)}-${d.slice(3)}`;
  if (d.length <= 11) return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`;
  return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7, 11)}`;
}

export function validatePhone(phone: string): string | null {
  const d = normalizePhoneDigits(phone);
  if (!/^01[016789]\d{7,8}$/.test(d)) {
    return "휴대폰 번호를 010-0000-0000 형식으로 입력하세요.";
  }
  return null;
}

export function validateBirthDate(isoDate: string): string | null {
  if (!isoDate) return "생년월일을 선택하세요.";
  const birth = new Date(`${isoDate}T12:00:00`);
  if (Number.isNaN(birth.getTime())) return "올바른 생년월일이 아닙니다.";
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const md = today.getMonth() - birth.getMonth();
  if (md < 0 || (md === 0 && today.getDate() < birth.getDate())) age -= 1;
  if (age < 14) return "만 14세 이상만 가입할 수 있습니다.";
  if (age > 120) return "생년월일을 확인해 주세요.";
  return null;
}

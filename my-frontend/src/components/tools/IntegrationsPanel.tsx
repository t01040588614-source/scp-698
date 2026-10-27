"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  integrationsApi,
  type IntegrationItem,
} from "@/services/integrationsApi";
import LoadingState from "@/components/common/LoadingState";
import ErrorState from "@/components/common/ErrorState";
import FcmTestBlock from "@/components/tools/FcmTestBlock";

function IntegrationCard({
  item,
  values,
  onChange,
  disabled,
}: {
  item: IntegrationItem;
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
  disabled: boolean;
}) {
  return (
    <article className="inv-investing-panel panel p-5 space-y-3">
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold">{item.name}</h3>
          <p className="text-muted-sm mt-1">{item.description}</p>
        </div>
        <span
          className={`badge-change text-xs ${item.active ? "badge-change--up" : ""}`}
          style={item.active ? undefined : { opacity: 0.7 }}
        >
          {item.active ? "적용 중" : "미설정"}
        </span>
      </header>
      <div className="space-y-2">
        {item.fields.map((f) => (
          <label key={f.key} className="block text-sm">
            <span className="form-label">
              {f.label}
              {f.required ? " *" : ""}
              {f.configured && f.masked ? (
                <span className="text-muted-sm ml-2">({f.source}: {f.masked})</span>
              ) : null}
            </span>
            <input
              type={f.secret ? "password" : "text"}
              className="form-input-plain w-full mt-1"
              placeholder={f.configured ? "변경 시에만 입력" : "키 입력"}
              value={values[f.key] ?? ""}
              onChange={(e) => onChange(f.key, e.target.value)}
              disabled={disabled}
              autoComplete="off"
            />
          </label>
        ))}
      </div>
      {item.docsUrl ? (
        <a href={item.docsUrl} target="_blank" rel="noreferrer" className="inv-widget-more text-sm">
          발급 안내 →
        </a>
      ) : null}
    </article>
  );
}

function SmsTestBlock({ active }: { active: boolean }) {
  const [phone, setPhone] = useState("");
  const [msg, setMsg] = useState("MarketLens SMS 연동 테스트입니다.");
  const [note, setNote] = useState("");

  const testMutation = useMutation({
    mutationFn: () => integrationsApi.testSms(phone, msg),
    onSuccess: (res) => setNote(`발송 성공 (${res.provider}) → ${res.phone}`),
    onError: (err: Error) => setNote(err.message || "발송 실패"),
  });

  if (!active) return null;

  return (
    <article className="inv-investing-panel panel p-5 space-y-3 lg:col-span-2">
      <h3 className="font-semibold">SMS 테스트 발송</h3>
      <p className="text-muted-sm">회원가입 본인인증과 동일한 채널로 테스트 문자를 보냅니다.</p>
      <div className="flex flex-wrap gap-3">
        <input
          className="form-input-plain flex-1 min-w-[12rem]"
          placeholder="010-0000-0000"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
        <input
          className="form-input-plain flex-[2] min-w-[16rem]"
          value={msg}
          onChange={(e) => setMsg(e.target.value)}
        />
        <button
          type="button"
          className="btn-secondary"
          disabled={testMutation.isPending || !phone.trim()}
          onClick={() => testMutation.mutate()}
        >
          테스트 SMS
        </button>
      </div>
      {note ? <p className="text-sm">{note}</p> : null}
    </article>
  );
}

export default function IntegrationsPanel() {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["integrations"],
    queryFn: () => integrationsApi.get(),
  });

  const saveMutation = useMutation({
    mutationFn: () => integrationsApi.saveKeys(draft),
    onSuccess: async (res) => {
      setDraft({});
      setMessage(`저장·적용 완료 (${res.integrations.filter((i) => i.active).length}개 연동 활성)`);
      await queryClient.invalidateQueries({ queryKey: ["integrations"] });
      await queryClient.invalidateQueries({ queryKey: ["oauthProviders"] });
      await queryClient.invalidateQueries({ queryKey: ["chatStatus"] });
    },
    onError: () => setMessage("저장 실패 — DEBUG 모드 또는 INTEGRATIONS_ALLOW_UI_SAVE 확인"),
  });

  const applyMutation = useMutation({
    mutationFn: () => integrationsApi.apply(),
    onSuccess: () => setMessage("시세 캐시를 다시 불러왔습니다."),
  });

  const allowSave = data?.allowUiSave ?? false;
  const activeIds = useMemo(
    () => (data?.integrations ?? []).filter((i) => i.active).map((i) => i.id),
    [data]
  );

  if (isLoading) return <LoadingState rows={6} />;
  if (isError) return <ErrorState onRetry={() => void refetch()} />;

  return (
    <div className="space-y-4">
      <div className="inv-investing-panel panel p-4 text-sm space-y-2">
        <p>
          <strong>`.env`</strong>에 넣거나 아래 폼으로 저장하면 즉시 반영됩니다. env에 있는 키는 UI에서
          덮어쓰지 않습니다.
        </p>
        <p className="text-muted-sm tabular">저장 파일: {data?.keysFile}</p>
        {activeIds.length > 0 ? (
          <p className="text-muted-sm">활성 연동: {activeIds.join(", ")}</p>
        ) : (
          <p className="text-muted-sm">활성 연동 없음 — Yahoo/FDR 기본 시세 사용 중</p>
        )}
        {data?.market?.korea_source ? (
          <p className="text-muted-sm">
            시세 소스 — KR: {String(data.market.korea_source)}, US: {String(data.market.us_source)}
          </p>
        ) : null}
      </div>

      {message ? <p className="inv-page-desc">{message}</p> : null}

      <div className="grid gap-4 lg:grid-cols-2">
        {(data?.integrations ?? []).map((item) => (
          <IntegrationCard
            key={item.id}
            item={item}
            values={draft}
            disabled={!allowSave || saveMutation.isPending}
            onChange={(key, value) => setDraft((d) => ({ ...d, [key]: value }))}
          />
        ))}
        <SmsTestBlock active={(data?.integrations ?? []).some((i) => i.id === "sms_auth" && i.active)} />
        <FcmTestBlock active={(data?.integrations ?? []).some((i) => i.id === "fcm_push" && i.active)} />
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          className="btn-primary"
          disabled={!allowSave || saveMutation.isPending || Object.keys(draft).length === 0}
          onClick={() => saveMutation.mutate()}
        >
          키 저장 후 적용
        </button>
        <button
          type="button"
          className="btn-secondary"
          disabled={applyMutation.isPending}
          onClick={() => applyMutation.mutate()}
        >
          시세만 다시 불러오기
        </button>
      </div>
      {!allowSave ? (
        <p className="text-muted-sm">
          UI 저장이 꺼져 있으면 `stock-backend/.env` 또는 `data/integration_keys.json`에 직접 입력하세요.
        </p>
      ) : null}
    </div>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  krStockApi,
  loadLocalScreeners,
  saveLocalScreener,
  type KrScreener,
  type KrScreenerConditions,
} from "@/services/krStockApi";

type Props = {
  value: KrScreenerConditions;
  onChange: (next: KrScreenerConditions) => void;
  onApply: () => void;
};

export default function KoreaScreenerPanel({ value, onChange, onApply }: Props) {
  const { isAuthenticated } = useAuth();
  const [name, setName] = useState("");
  const [saved, setSaved] = useState<KrScreener[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  const refreshList = useCallback(async () => {
    if (isAuthenticated) {
      try {
        const res = await krStockApi.listScreeners();
        setSaved(res.data);
        return;
      } catch {
        /* fallback local */
      }
    }
    setSaved(loadLocalScreeners());
  }, [isAuthenticated]);

  useEffect(() => {
    void refreshList();
  }, [refreshList]);

  const patch = (partial: KrScreenerConditions) => onChange({ ...value, ...partial });

  const handleSave = async () => {
    if (!name.trim()) {
      setMessage("스크리너 이름을 입력하세요.");
      return;
    }
    setMessage(null);
    if (isAuthenticated) {
      try {
        await krStockApi.saveScreener(name.trim(), value);
        setName("");
        await refreshList();
        setMessage("서버에 저장했습니다.");
        return;
      } catch {
        setMessage("서버 저장 실패 — 로컬에 저장합니다.");
      }
    }
    saveLocalScreener(name.trim(), value);
    setName("");
    await refreshList();
    setMessage("로컬에 저장했습니다. (로그인 시 서버 동기화)");
  };

  const loadScreener = (s: KrScreener) => {
    onChange(s.conditions);
    onApply();
  };

  const deleteScreener = async (s: KrScreener) => {
    if (!confirm(`「${s.name}」 스크리너를 삭제할까요?`)) return;
    if (isAuthenticated && s.id > 0) {
      try {
        await krStockApi.deleteScreener(s.id);
        await refreshList();
        setMessage("삭제했습니다.");
        return;
      } catch {
        setMessage("서버 삭제 실패");
      }
    }
    const local = loadLocalScreeners().filter((x) => x.id !== s.id);
    localStorage.setItem("kr-local-screeners", JSON.stringify(local));
    await refreshList();
  };

  return (
    <section className="inv-screener panel">
      <header className="inv-screener-head">
        <h3 className="inv-widget-title">종목 스크리너</h3>
        <p className="inv-page-desc inv-page-desc--compact">
          필터·정렬·저장으로 원하는 종목을 빠르게 찾아보세요.
        </p>
      </header>
      <div className="inv-screener-grid">
        <label>
          검색
          <input
            type="search"
            value={value.query ?? ""}
            onChange={(e) => patch({ query: e.target.value })}
            placeholder="종목명·코드"
          />
        </label>
        <label>
          시장
          <select
            value={value.market ?? ""}
            onChange={(e) => patch({ market: e.target.value || undefined })}
          >
            <option value="">전체</option>
            <option value="KOSPI">KOSPI</option>
            <option value="KOSDAQ">KOSDAQ</option>
          </select>
        </label>
        <label>
          섹터
          <input
            value={value.sector ?? ""}
            onChange={(e) => patch({ sector: e.target.value || undefined })}
            placeholder="예: IT"
          />
        </label>
        <label>
          업종
          <input
            value={value.industry ?? ""}
            onChange={(e) => patch({ industry: e.target.value || undefined })}
            placeholder="예: 반도체"
          />
        </label>
        <label>
          PER ≥
          <input
            type="number"
            value={value.perGte ?? ""}
            onChange={(e) => patch({ perGte: e.target.value ? Number(e.target.value) : undefined })}
          />
        </label>
        <label>
          PER ≤
          <input
            type="number"
            value={value.perLte ?? ""}
            onChange={(e) => patch({ perLte: e.target.value ? Number(e.target.value) : undefined })}
          />
        </label>
        <label>
          PBR ≥
          <input
            type="number"
            value={value.pbrGte ?? ""}
            onChange={(e) => patch({ pbrGte: e.target.value ? Number(e.target.value) : undefined })}
          />
        </label>
        <label>
          PBR ≤
          <input
            type="number"
            value={value.pbrLte ?? ""}
            onChange={(e) => patch({ pbrLte: e.target.value ? Number(e.target.value) : undefined })}
          />
        </label>
        <label>
          배당 ≥ (%)
          <input
            type="number"
            value={value.dividendYieldGte ?? ""}
            onChange={(e) =>
              patch({ dividendYieldGte: e.target.value ? Number(e.target.value) : undefined })
            }
          />
        </label>
        <label>
          정렬
          <select
            value={value.sortBy ?? "marketCap"}
            onChange={(e) => patch({ sortBy: e.target.value })}
          >
            <option value="marketCap">시가총액</option>
            <option value="per">PER</option>
            <option value="pbr">PBR</option>
            <option value="dividendYield">배당</option>
            <option value="name">이름</option>
            <option value="price">가격</option>
          </select>
        </label>
        <label>
          순서
          <select
            value={value.sortOrder ?? "DESC"}
            onChange={(e) => patch({ sortOrder: e.target.value as "ASC" | "DESC" })}
          >
            <option value="DESC">내림차순</option>
            <option value="ASC">오름차순</option>
          </select>
        </label>
      </div>
      <div className="inv-screener-actions">
        <button type="button" className="btn-primary" onClick={onApply}>
          필터 적용
        </button>
        <input
          type="text"
          placeholder="스크리너 이름"
          value={name}
          onChange={(e) => setName(e.target.value)}
          aria-label="스크리너 이름"
        />
        <button type="button" className="inv-btn" onClick={() => void handleSave()}>
          스크리너 저장
        </button>
      </div>
      {message ? <p className="inv-page-desc">{message}</p> : null}
      {saved.length > 0 ? (
        <ul className="inv-widget-list">
          {saved.map((s) => (
            <li key={s.id} className="inv-screener-saved-row">
              <button type="button" className="search-result-item" onClick={() => loadScreener(s)}>
                {s.name}
              </button>
              <button type="button" className="inv-btn" onClick={() => void deleteScreener(s)}>
                삭제
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

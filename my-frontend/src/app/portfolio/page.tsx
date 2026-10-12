'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { CHART_HEIGHT } from '@/config/chartLayout';
import { stockApi } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import type { PortfolioItem } from '@/types/stock';
import { applyLiveToPortfolio } from '@/lib/liveQuoteMerge';
import { useLiveSymbols } from '@/hooks/useLiveSymbols';
import LiveStreamBadge from '@/components/common/LiveStreamBadge';
import { formatPrice, priceClass } from '@/lib/format';
import { Plus, Pencil, Trash2, X } from 'lucide-react';
import PortfolioAccountsHub from '@/components/portfolio/PortfolioAccountsHub';
import StockCompanyLogo from '@/components/market/StockCompanyLogo';

// 차분한 muted 차트 색상
const COLORS = ['#475569', '#64748B', '#94A3B8', '#C4524A', '#3B6FB4', '#7C8DA6'];

interface SummaryCardProps {
  title: string;
  value: string;
  subValue?: string;
  isPositive?: boolean;
}

function SummaryCard({ title, value, subValue, isPositive }: SummaryCardProps) {
  return (
    <div className="inv-portfolio-summary-card">
      <p className="inv-portfolio-summary-label">{title}</p>
      <p className="inv-portfolio-summary-value">{value}</p>
      {subValue && (
        <p className={`text-sm font-semibold mt-1 ${isPositive ? 'price-up' : 'price-down'}`}>
          {subValue}
        </p>
      )}
    </div>
  );
}

interface PortfolioFormData {
  symbol: string;
  name: string;
  stockType: 'korea' | 'us';
  quantity: number;
  averagePrice: number;
}

const emptyForm: PortfolioFormData = {
  symbol: '',
  name: '',
  stockType: 'korea',
  quantity: 0,
  averagePrice: 0,
};

function LegacyPortfolioSection() {
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<PortfolioItem | null>(null);
  const [formData, setFormData] = useState<PortfolioFormData>(emptyForm);
  const [formError, setFormError] = useState('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['portfolio'],
    queryFn: () => stockApi.getPortfolio().then((res) => res.data),
    retry: false,
    enabled: isAuthenticated,
  });

  const portfolio = useMemo(() => data ?? [], [data]);
  const symbols = useMemo(() => portfolio.map((p) => p.symbol), [portfolio]);
  const { quotes, flash, isConnected } = useLiveSymbols(symbols);
  const livePortfolio = useMemo(
    () => portfolio.map((item) => applyLiveToPortfolio(item, quotes[item.symbol])),
    [portfolio, quotes]
  );

  const addMutation = useMutation({
    mutationFn: (item: Partial<PortfolioItem>) => stockApi.addToPortfolio(item),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolio'] });
      closeModal();
    },
    onError: () => setFormError('포트폴리오 추가에 실패했습니다.'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, item }: { id: number; item: Partial<PortfolioItem> }) =>
      stockApi.updatePortfolio(id, item),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolio'] });
      closeModal();
    },
    onError: () => setFormError('포트폴리오 수정에 실패했습니다.'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => stockApi.deleteFromPortfolio(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['portfolio'] }),
  });

  const totalValue = livePortfolio.reduce((sum, item) => sum + item.totalValue, 0);
  const totalProfitLoss = livePortfolio.reduce((sum, item) => sum + item.profitLoss, 0);
  const profitLossPercent = totalValue > 0 ? (totalProfitLoss / (totalValue - totalProfitLoss)) * 100 : 0;

  const pieData = livePortfolio.map((item) => ({
    name: item.symbol,
    value: item.totalValue,
  }));

  const openAddModal = () => {
    setEditingItem(null);
    setFormData(emptyForm);
    setFormError('');
    setIsModalOpen(true);
  };

  const openEditModal = (item: PortfolioItem) => {
    setEditingItem(item);
    setFormData({
      symbol: item.symbol,
      name: item.name,
      stockType: item.stockType,
      quantity: item.quantity,
      averagePrice: item.averagePrice,
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingItem(null);
    setFormData(emptyForm);
    setFormError('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!formData.symbol || !formData.name || formData.quantity <= 0 || formData.averagePrice <= 0) {
      setFormError('모든 필드를 올바르게 입력해주세요.');
      return;
    }

    const payload: Partial<PortfolioItem> = {
      symbol: formData.symbol.toUpperCase(),
      name: formData.name,
      stockType: formData.stockType,
      quantity: Number(formData.quantity),
      averagePrice: Number(formData.averagePrice),
    };

    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, item: payload });
    } else {
      addMutation.mutate(payload);
    }
  };

  const handleDelete = (item: PortfolioItem) => {
    if (confirm(`정말 ${item.name}(${item.symbol})을 삭제하시겠습니까?`)) {
      deleteMutation.mutate(item.id);
    }
  };

  if (!isAuthenticated) {
    return (
      <section className="inv-portfolio-legacy inv-investing-panel panel mt-6">
        <h2 className="inv-portfolio-panel-head px-5 py-3">간편 보유 (로그인 · 서버 저장)</h2>
        <div className="inv-portfolio-empty px-5 pb-6">
          <p className="stock-name font-medium mb-1">로그인이 필요합니다</p>
          <p className="text-muted-sm mb-6">간편 포트폴리오를 확인하려면 로그인해 주세요.</p>
          <a href="/login" className="btn-primary px-5 py-2.5">
            로그인하러 가기
          </a>
        </div>
      </section>
    );
  }

  if (isLoading) {
    return (
      <section className="inv-portfolio-legacy mt-6">
        <h2 className="inv-portfolio-panel-head inv-investing-panel px-5 py-3 mb-0">간편 보유 (로그인 · 서버 저장)</h2>
        <div className="flex items-center justify-center min-h-[30vh] inv-investing-panel panel">
          <div className="text-center">
            <div className="spinner mb-3" />
            <p className="text-muted-sm">불러오는 중...</p>
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="inv-portfolio-legacy mt-6">
        <h2 className="inv-portfolio-panel-head inv-investing-panel px-5 py-3">간편 보유 (로그인 · 서버 저장)</h2>
        <div className="inv-portfolio-empty inv-investing-panel panel text-muted-sm">
          포트폴리오 데이터를 불러오지 못했습니다.
        </div>
      </section>
    );
  }

  return (
    <section className="inv-portfolio-legacy mt-6">
      <h2 className="inv-portfolio-panel-head inv-investing-panel px-5 py-3 mb-3">간편 보유 (로그인 · 서버 저장)</h2>
      <>
      <div className="inv-portfolio-toolbar">
        <LiveStreamBadge connected={isConnected} />
        <button onClick={openAddModal} className="btn-primary flex items-center space-x-1.5 px-4 py-2.5">
          <Plus className="w-4 h-4" />
          <span>종목 추가</span>
        </button>
      </div>

      {portfolio.length === 0 ? (
        <div className="inv-portfolio-empty inv-investing-panel panel">
          <p className="stock-name font-medium mb-1">아직 등록된 종목이 없습니다.</p>
          <p className="text-muted-sm mb-6">종목 추가 버튼으로 첫 포트폴리오를 만들어보세요.</p>
          <button onClick={openAddModal} className="btn-secondary inline-flex items-center space-x-1.5 px-4 py-2.5">
            <Plus className="w-4 h-4" />
            <span>첫 종목 추가</span>
          </button>
        </div>
      ) : (
        <>
          <div className="inv-portfolio-summary-grid inv-investing-panel">
            <SummaryCard title="총 자산" value={`₩${totalValue.toLocaleString()}`} />
            <SummaryCard
              title="총 손익"
              value={`${totalProfitLoss >= 0 ? '+' : ''}₩${totalProfitLoss.toLocaleString()}`}
              subValue={`(${profitLossPercent >= 0 ? '+' : ''}${profitLossPercent.toFixed(2)}%)`}
              isPositive={totalProfitLoss >= 0}
            />
            <SummaryCard title="보유 종목" value={`${portfolio.length}개`} />
          </div>

          <div className="inv-portfolio-split inv-investing-panel">
            <section>
              <h2 className="inv-portfolio-panel-head">자산 배분</h2>
              <div className="p-5">
              <ResponsiveContainer width="100%" height={CHART_HEIGHT.portfolioPie}>
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    innerRadius={55}
                    paddingAngle={2}
                    label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                    labelLine={false}
                    fontSize={12}
                  >
                    {pieData.map((entry, index) => (
                      <Cell
                        key={entry.name}
                        fill={COLORS[index % COLORS.length]}
                        stroke="#fff"
                        strokeWidth={2}
                      />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => `₩${Number(v).toLocaleString()}`} />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" iconSize={8} />
                </PieChart>
              </ResponsiveContainer>
              </div>
            </section>

            <section>
              <h2 className="inv-portfolio-panel-head">보유 종목</h2>
              <div className="inv-table-wrap overflow-x-auto">
                <table className="inv-table inv-table--investing-exact">
                  <thead>
                    <tr>
                      <th className="text-left px-5">종목</th>
                      <th className="text-right px-4">수량</th>
                      <th className="text-right px-4">평가금액</th>
                      <th className="text-right px-4">수익률</th>
                      <th className="text-center px-4">관리</th>
                    </tr>
                  </thead>
                  <tbody>
                    {livePortfolio.map((item) => {
                      const flashDir = flash[item.symbol];
                      const rowFlash = flashDir ? `is-flash-${flashDir}` : undefined;
                      const cellFlash = flashDir ? `inv-last-flash is-flash-${flashDir}` : "";
                      const decimals = item.stockType === "us" ? 2 : 0;
                      return (
                      <tr key={item.id} className={rowFlash}>
                        <td className="px-5 py-3">
                          <div className="stock-name-row">
                            <StockCompanyLogo
                              market={item.stockType === 'us' ? 'us' : 'korea'}
                              symbol={item.symbol}
                              name={item.name}
                              size={28}
                            />
                            <div className="stock-name-block">
                              <p className="stock-name">{item.name}</p>
                              <p className="stock-symbol tabular">{item.symbol}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <p className="tabular stock-price">{item.quantity}주</p>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <p className={`font-bold tabular stock-price inv-last ${cellFlash}`.trim()}>
                            {item.stockType === "korea"
                              ? `₩${item.totalValue.toLocaleString()}`
                              : formatPrice(item.totalValue, decimals)}
                          </p>
                          <p className={`text-xs tabular ${priceClass(item.profitLoss)}`}>
                            {formatPrice(item.currentPrice, decimals)}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span
                            className={`badge-change ${
                              item.profitLoss >= 0 ? 'badge-change--up' : 'badge-change--down'
                            }`}
                          >
                            {item.profitLossPercent.toFixed(2)}%
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center space-x-1">
                            <button
                              onClick={() => openEditModal(item)}
                              className="p-2 rounded-lg text-muted-sm hover:opacity-80"
                              style={{ color: 'var(--text-muted)' }}
                              title="수정"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(item)}
                              className="p-2 rounded-lg hover:opacity-80 price-up"
                              title="삭제"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );})}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </>
      )}

      {isModalOpen && (
        <div className="modal-root">
          <button type="button" className="modal-overlay" aria-label="닫기" onClick={closeModal} />
          <div className="modal-dialog">
            <div className="modal-header">
              <h3 className="panel-title">{editingItem ? '종목 수정' : '종목 추가'}</h3>
              <button type="button" onClick={closeModal} aria-label="모달 닫기">
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && <div className="form-error">{formError}</div>}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="form-label">종목 코드</label>
                  <input
                    type="text"
                    value={formData.symbol}
                    onChange={(e) => setFormData({ ...formData, symbol: e.target.value })}
                    className="form-input-plain"
                    placeholder="005930"
                    required
                  />
                </div>
                <div>
                  <label className="form-label">종목명</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="form-input-plain"
                    placeholder="삼성전자"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="form-label">시장</label>
                <div className="flex gap-2">
                  {(['korea', 'us'] as const).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setFormData({ ...formData, stockType: type })}
                      className={`segment-btn ${formData.stockType === type ? 'is-active' : ''}`}
                    >
                      {type === 'korea' ? '한국 주식' : '미국 주식'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="form-label">수량</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: Number(e.target.value) })}
                    className="form-input-plain"
                    required
                  />
                </div>
                <div>
                  <label className="form-label">평균 매수가</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.averagePrice}
                    onChange={(e) => setFormData({ ...formData, averagePrice: Number(e.target.value) })}
                    className="form-input-plain"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={addMutation.isPending || updateMutation.isPending}
                className="btn-primary w-full py-3 disabled:opacity-50"
              >
                {editingItem ? '수정 완료' : '추가 완료'}
              </button>
            </form>
          </div>
        </div>
      )}
      </>
    </section>
  );
}

export default function PortfolioPage() {
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.hash === '#docx-accounts') {
      document.getElementById('docx-accounts')?.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

  return (
    <>
      <PortfolioAccountsHub />
      <LegacyPortfolioSection />
    </>
  );
}

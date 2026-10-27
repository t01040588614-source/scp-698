/** 외부 CSS 404(.next 꼬임) 시에도 Investing 톤·레이아웃 유지 */
export const CRITICAL_LAYOUT_CSS = `
:root,[data-theme="light"]{--page-background:#f3f3f3;--surface:#fff;--surface-muted:#f5f7fa;--text-primary:#232526;--text-secondary:#444b54;--text-muted:#6b7280;--border-color:#e6e9ef;--primary:#006bf6;--inv-brand:#006bf6;--primary-light:#e8f2ff;--chrome-bg:#fff;--chrome-bg-elevated:#f8fafc;--chrome-border:#e6e9ef;--chrome-text:#232526;--chrome-text-muted:#64748b;--chrome-link:#006bf6;--header-bg:var(--chrome-bg);--header-border:var(--chrome-border);--header-shadow:0 1px 2px rgba(35,37,38,.06);--market-up:#d64045;--market-up-bg:#fdecef;--market-down:#006bf6;--market-down-bg:#e8f2ff;--ticker-bleed-bg:linear-gradient(180deg,#f8fafc 0%,#f5f7fa 100%);--market-rail-bg:var(--ticker-bleed-bg);--max-width:1360px;--header-height:56px;--mobile-header-height:52px;--bottom-navigation-height:56px;--space-3:12px;--space-4:16px;--space-5:20px;--space-6:24px;--radius-sm:4px;--radius-md:6px;--shadow-sm:0 1px 2px rgba(35,37,38,.06)}
[data-theme="dark"]{--page-background:#0f1419;--surface:#1a2332;--surface-muted:#151c27;--surface-elevated:#212d3d;--surface-inset:#0d1219;--text-primary:#f3f4f6;--text-secondary:#c8d0dc;--text-muted:#8b95a5;--border-color:#2d3a4d;--border-subtle:#1f2937;--primary:#4d9dff;--primary-light:rgba(77,157,255,.15);--chrome-bg:#151c27;--chrome-bg-elevated:#1a2332;--chrome-border:#2d3a4d;--chrome-text:#f3f4f6;--chrome-text-muted:#94a3b8;--chrome-link:#93c5fd;--header-bg:var(--chrome-bg);--header-border:var(--chrome-border);--market-up:#ff6b6b;--market-up-bg:rgba(255,107,107,.14);--market-down:#4d9dff;--market-down-bg:rgba(77,157,255,.14);--inv-table-header-bg:#151c27;--ticker-bleed-bg:#0f1419;--market-rail-bg:#0f1419;--market-status-bg:#0f1419;--ticker-card-shadow:0 1px 3px rgba(0,0,0,.35),0 0 0 1px rgba(255,255,255,.05) inset}
*,*::before,*::after{box-sizing:border-box}
html{min-width:320px}
body{margin:0;min-width:320px;background:var(--page-background);color:var(--text-primary);font-family:Pretendard,-apple-system,BlinkMacSystemFont,"Segoe UI","Malgun Gothic",sans-serif;font-size:14px;line-height:1.45;-webkit-font-smoothing:antialiased}
a{color:inherit;text-decoration:none}
.container{width:min(calc(100% - var(--content-gutter,16px)*2),var(--max-width,1360px));margin-inline:auto;max-width:var(--max-width,1360px)}
@media(min-width:1280px){:root{--content-gutter:12px}.container{width:calc(100% - var(--content-gutter)*2);max-width:none}}
.mobile-header{display:none}
.bottom-navigation{display:none}
.desktop-header{display:block;background:var(--header-bg);border-bottom:1px solid var(--header-border);color:var(--chrome-text);box-shadow:var(--header-shadow,none)}
.primary-navigation-bar{display:none;width:100%;background:var(--chrome-bg-elevated);border-bottom:1px solid var(--chrome-border)}
@media(min-width:768px){.primary-navigation-bar{display:block}}
.primary-navigation{display:flex;gap:var(--space-4);align-items:center;overflow-x:auto;background:transparent;border:0;min-height:44px}
.primary-navigation a{flex:0 0 auto;padding:var(--space-3) var(--space-4);font-size:13px;font-weight:600;color:var(--chrome-text-muted)}
.market-ticker-bleed{width:100%;border-bottom:1px solid var(--border-color,#e6e9ef);background:var(--ticker-bleed-bg,var(--market-rail-bg,#f5f7fa))}
.market-ticker-wrap,.market-ticker-bleed .market-ticker{background:transparent}
.market-ticker{display:flex;flex-wrap:nowrap;align-items:stretch;gap:12px;padding:14px 0 16px;overflow-x:auto;overflow-y:visible;min-height:0}
.ticker-item{flex:0 0 auto;min-width:168px;max-width:220px;height:auto;min-height:96px;border-radius:6px;box-sizing:border-box}
.panel{padding:var(--space-4);margin-bottom:var(--space-4);background:var(--surface);border:1px solid var(--border-color);border-radius:6px}
@media(max-width:767px){.desktop-header{display:none!important}.mobile-header{display:flex!important;align-items:center;justify-content:space-between;min-height:var(--mobile-header-height);padding:0 12px;background:var(--header-bg);border-bottom:1px solid var(--header-border)}.primary-navigation{display:none!important}.bottom-navigation{display:flex!important;position:fixed;right:0;bottom:0;left:0;z-index:120;min-height:var(--bottom-navigation-height);align-items:center;justify-content:space-around;background:var(--header-bg);border-top:1px solid var(--header-border)}main.app-main{padding-bottom:calc(var(--bottom-navigation-height) + 16px)}}
.inv-layout-3col{display:grid;grid-template-columns:48px minmax(0,1fr) minmax(260px,300px);gap:16px;align-items:start}
@media(max-width:1023px){.inv-layout-3col{grid-template-columns:minmax(0,1fr)}.inv-layout-3col .inv-side-slot--rail{display:none!important}.inv-layout-3col .inv-side-slot--aside{display:block!important;visibility:visible!important;width:100%!important;min-width:0!important;max-height:none!important;overflow:visible!important}.inv-equity-page .inv-split-aside{position:static!important;max-height:none!important;overflow:visible!important}}
@media(min-width:1024px){.inv-split-aside{position:relative!important;top:auto!important;max-height:none!important;overflow:visible!important}}
.inv-equity-instrument{background:var(--surface);border:1px solid var(--border-color);border-radius:4px;padding:16px;margin-bottom:12px}
.inv-equity-tabs{display:flex;flex-wrap:wrap;border-bottom:1px solid var(--border-color);margin-bottom:8px}
.inv-equity-tab,.inv-equity-subtab{display:inline-block;padding:10px 14px;font-size:13px;font-weight:600;color:var(--text-secondary);background:transparent;border:0;cursor:pointer}
.inv-stream-body{display:flex;flex-direction:row;min-height:0;width:100%}
.inv-stream-main{flex:1;min-width:0;display:flex;flex-direction:column}
.inv-stream-toolbar-row,.inv-stream-toolbar-sub{display:flex;flex-wrap:wrap;align-items:center;gap:4px}
.inv-stream-stage-wrap{position:relative;flex:1;min-height:280px}
.inv-chart-frame{display:flex;flex-direction:column;background:var(--surface)}
.inv-investing-chart-canvas{width:100%;min-height:240px}
`;

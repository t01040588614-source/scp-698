import Link from "next/link";

export default function NotFound() {
  return (
    <div className="container inv-page" style={{ paddingTop: 48, paddingBottom: 48 }}>
      <h1 className="inv-page-title">페이지를 찾을 수 없습니다</h1>
      <p className="inv-page-desc">주소가 바뀌었거나 삭제된 페이지일 수 있습니다.</p>
      <p style={{ marginTop: 16 }}>
        <Link href="/korea" className="btn-primary">
          한국 시장 홈
        </Link>
      </p>
    </div>
  );
}

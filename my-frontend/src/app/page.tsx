import { redirect } from "next/navigation";
import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata({
  title: "시장 · 종목",
  path: "/",
});

export default function Home() {
  redirect("/markets");
}

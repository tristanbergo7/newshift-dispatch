import { notFound } from "next/navigation";
import BoardView from "@/components/BoardView";
import { getCompany } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function CompanyBoardPage({ params }: { params: Promise<{ slug: string }> }) {
  const c = getCompany((await params).slug);
  if (!c) notFound();
  return <BoardView company={{ slug: c.slug, name: c.name }} />;
}

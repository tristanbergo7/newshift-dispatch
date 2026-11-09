import { notFound, redirect } from "next/navigation";
import BoardView from "@/components/BoardView";
import { canAccess } from "@/lib/auth";
import { getCompany } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function CompanyBoardPage({ params }: { params: Promise<{ slug: string }> }) {
  const c = getCompany((await params).slug);
  if (!c) notFound();
  if (!(await canAccess(c.slug))) redirect(`/login?next=/c/${c.slug}/board`);
  return <BoardView company={{ slug: c.slug, name: c.name }} />;
}

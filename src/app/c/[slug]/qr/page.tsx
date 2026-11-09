import { notFound } from "next/navigation";
import QrView from "@/components/QrView";
import { getCompany } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function CompanyQrPage({ params }: { params: Promise<{ slug: string }> }) {
  const c = getCompany((await params).slug);
  if (!c) notFound();
  return <QrView slug={c.slug} name={c.name} />;
}

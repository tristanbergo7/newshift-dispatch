import { notFound } from "next/navigation";
import UploadView from "@/components/UploadView";
import { getCompany } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function CompanyUploadPage({ params }: { params: Promise<{ slug: string }> }) {
  const c = getCompany((await params).slug);
  if (!c) notFound();
  return <UploadView company={{ slug: c.slug, name: c.name }} />;
}

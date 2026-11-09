import UploadView from "@/components/UploadView";
import { DEMO_SLUG, getCompany } from "@/lib/store";

export const dynamic = "force-dynamic";

export default function UploadPage() {
  const c = getCompany(DEMO_SLUG)!;
  return <UploadView company={{ slug: c.slug, name: c.name }} />;
}

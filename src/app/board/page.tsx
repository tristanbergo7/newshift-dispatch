import BoardView from "@/components/BoardView";
import { DEMO_SLUG, getCompany } from "@/lib/store";

export const dynamic = "force-dynamic";

export default function BoardPage() {
  const c = getCompany(DEMO_SLUG)!;
  return <BoardView company={{ slug: c.slug, name: c.name }} />;
}

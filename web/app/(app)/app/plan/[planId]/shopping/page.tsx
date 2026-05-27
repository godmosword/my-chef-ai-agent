import { PlanShoppingClient } from "./PlanShoppingClient";

type Props = { params: Promise<{ planId: string }> };

export default async function PlanShoppingPage({ params }: Props) {
  const { planId } = await params;
  return <PlanShoppingClient planId={planId} />;
}

import { SharedShoppingClient } from "./SharedShoppingClient";

type Props = { params: Promise<{ token: string }> };

export default async function SharedShoppingPage({ params }: Props) {
  const { token } = await params;
  return <SharedShoppingClient token={token} />;
}

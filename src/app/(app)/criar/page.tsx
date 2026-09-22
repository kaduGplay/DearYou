import Wizard from "@/components/wizard/Wizard";
import { getUser } from "@/lib/auth";

export const metadata = { title: "Criar minha página" };

export default async function Page() {
  const user = await getUser();
  return <Wizard kind="amor" loggedIn={!!user} userName={user?.name} />;
}

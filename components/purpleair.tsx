import { createClient } from "@/utils/supabase/server";

export default async function PurpleAir() {
  const supabase = createClient();
  const { data: purple_air } = await supabase.from("purple_air").select();

  return <pre>{JSON.stringify(purple_air, null, 2)}</pre>;
}

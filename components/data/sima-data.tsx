import { createClient } from "@/utils/supabase/server";

export default async function SimaData() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sima_mediciones")
    .select()
    .order("time_stamp", { ascending: false })
    .limit(13);

  if (error) {
    console.error("SIMA Data fetch error:", error);
    throw new Error(`Failed to fetch SIMA data: ${error.message}`);
  }

  return data || [];
}

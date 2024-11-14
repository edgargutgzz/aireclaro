import { createClient } from "@/utils/supabase/server";

export default async function SimaData() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("sima_mediciones")
    .select()
    .order("time_stamp", { ascending: false })
    .limit(13);

  if (error) {
    console.error("Error:", error);
    return [];
  }

  return data;
}

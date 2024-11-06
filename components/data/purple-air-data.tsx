import { createClient } from "@/utils/supabase/server";

export default async function PurpleAirData() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("calidad_aire")
    .select()
    .order("time_stamp", { ascending: false })
    .limit(83);

  if (error) {
    console.error("Error:", error);
    return [];
  }

  return data;
}

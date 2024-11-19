import { createClient } from "@/utils/supabase/server";

export default async function PurpleAirData() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("purpleair_mediciones")
    .select()
    .order("time_stamp", { ascending: false });

  if (error) {
    console.error("Error:", error);
    return [];
  }

  return data;
}

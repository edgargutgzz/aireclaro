import { createClient } from "@/utils/supabase/server";

export default async function PurpleAirSensors() {
  const supabase = createClient();
  const { data, error } = await supabase.from("sensores").select();

  if (error) {
    console.error("Error:", error);
    return [];
  }

  return data;
}

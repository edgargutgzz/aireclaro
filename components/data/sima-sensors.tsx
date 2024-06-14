import { createClient } from "@/utils/supabase/server";

export default async function SimaSensors() {
  const supabase = createClient();
  const { data, error } = await supabase.from("sensores_sima").select();

  if (error) {
    console.error("Error:", error);
    return [];
  }

  return data;
}

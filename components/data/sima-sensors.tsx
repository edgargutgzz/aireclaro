import { createClient } from "@/utils/supabase/server";

export default async function SimaSensors() {
  const supabase = createClient();
  const { data, error } = await supabase.from("sima_sensores").select();

  if (error) {
    return [];
  }

  return data;
}

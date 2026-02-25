import { supabase } from "@/lib/supabase";

export const getServerTime = async (): Promise<Date> => {
  try {
    const { data, error } = await supabase.rpc('get_server_time');
    if (error) return new Date();
    return new Date(data);
  } catch {
    return new Date();
  }
};

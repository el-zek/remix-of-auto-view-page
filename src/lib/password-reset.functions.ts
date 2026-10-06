import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { phoneIdentity } from "@/lib/phone-auth";

const norm = (s: string | null | undefined) => (s ?? "").trim().replace(/\s+/g, " ").toLowerCase();

/** Resets a password after verifying the account's registered full name + phone. */
export const resetPasswordWithIdentity = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({
      phone: z.string().min(9).max(20),
      fullName: z.string().min(2).max(120),
      newPassword: z.string().min(6).max(72),
    }).parse(d),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const email = phoneIdentity(data.phone);
    const fail = { ok: false as const, message: "Name or phone number does not match our records" };

    let userId: string | null = null;
    for (let page = 1; page <= 20 && !userId; page++) {
      const { data: list, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 200 });
      if (error) throw new Error("Could not verify account");
      userId = list.users.find((u) => u.email?.toLowerCase() === email)?.id ?? null;
      if (list.users.length < 200) break;
    }
    if (!userId) return fail;

    const { data: profile } = await supabaseAdmin.from("profiles").select("full_name").eq("id", userId).maybeSingle();
    if (!profile || norm(profile.full_name) !== norm(data.fullName)) return fail;

    const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, { password: data.newPassword });
    if (error) throw new Error("Could not update password");
    return { ok: true as const, message: "Password updated. You can now sign in." };
  });

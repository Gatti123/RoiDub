import { cookies } from "next/headers";
import type { Lang } from "./types";

export function getLang(): Lang {
  return cookies().get("lang")?.value === "ru" ? "ru" : "en";
}

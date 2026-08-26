import { translateText } from "../Utils";

export function formatLastOnline(
  lastSeenAt: string | undefined,
  online = false,
  now = Date.now(),
): string {
  if (online) return translateText("presence.online_now");
  if (!lastSeenAt) return translateText("presence.last_online_unknown");
  const timestamp = Date.parse(lastSeenAt);
  if (!Number.isFinite(timestamp)) {
    return translateText("presence.last_online_unknown");
  }
  const elapsed = Math.max(0, now - timestamp);
  if (elapsed < 60_000) return translateText("presence.last_online_just_now");
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;
  let value: number;
  let unit: Intl.RelativeTimeFormatUnit;
  if (elapsed < hour) {
    value = -Math.floor(elapsed / minute);
    unit = "minute";
  } else if (elapsed < day) {
    value = -Math.floor(elapsed / hour);
    unit = "hour";
  } else {
    value = -Math.floor(elapsed / day);
    unit = "day";
  }
  const relative = new Intl.RelativeTimeFormat(undefined, {
    numeric: "always",
    style: "short",
  }).format(value, unit);
  return translateText("presence.last_online", { time: relative });
}

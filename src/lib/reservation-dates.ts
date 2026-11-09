const RESTAURANT_TIME_ZONE = "Asia/Karachi";

export function getReservationDateLimits(today = new Date()): {
  today: string;
  lastDate: string;
  firstAvailableTime: string;
} {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: RESTAURANT_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(today);

  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;
  const hours = parts.find((part) => part.type === "hour")?.value;
  const minutes = parts.find((part) => part.type === "minute")?.value;
  if (!year || !month || !day || !hours || !minutes) {
    throw new Error("Could not determine the restaurant's local opening date and time.");
  }

  const date = `${year}-${month}-${day}`;
  const lastDate = new Date(`${date}T12:00:00.000Z`);
  lastDate.setUTCDate(lastDate.getUTCDate() + 180);
  const firstSlotMinutes = Math.ceil((Number(hours) * 60 + Number(minutes) + 1) / 15) * 15;
  const firstAvailableTime =
    firstSlotMinutes >= 24 * 60
      ? "24:00"
      : `${String(Math.floor(firstSlotMinutes / 60)).padStart(2, "0")}:${String(firstSlotMinutes % 60).padStart(2, "0")}`;

  return {
    today: date,
    lastDate: lastDate.toISOString().slice(0, 10),
    firstAvailableTime,
  };
}

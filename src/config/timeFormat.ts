export default function formatTimeAgo(date: any): string {
  if (!date) return "";

  // Normalize Firestore Timestamp (has toDate), object with seconds, number (ms or s), string, or Date
  let d: Date;
  if (typeof date === "object" && typeof date.toDate === "function") {
    d = date.toDate();
  } else if (typeof date === "object" && typeof date.seconds === "number") {
    d = new Date(date.seconds * 1000);
  } else if (typeof date === "number") {
    // treat as seconds if small, otherwise milliseconds
    d = date > 1e12 ? new Date(date) : new Date(date * 1000);
  } else if (typeof date === "string") {
    d = new Date(date);
  } else if (date instanceof Date) {
    d = date;
  } else {
    // fallback: try to create a date
    d = new Date(date as any);
  }

  if (isNaN(d.getTime())) return "";

  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  const diffWeek = Math.floor(diffDay / 7);
  const diffMonth = Math.floor(diffDay / 30);
  const diffYear = Math.floor(diffDay / 365);

  if (diffSec < 5) return "just now";
  if (diffSec < 60) return `${diffSec}s ago`;
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  if (diffWeek < 4) return `${diffWeek}w ago`;
  if (diffMonth < 12) return `${diffMonth}mo ago`;
  return `${diffYear}y ago`;
}

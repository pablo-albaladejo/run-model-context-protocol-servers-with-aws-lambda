export class DateUtils {
  static formatTimestamp(timestamp: string): string {
    return new Date(timestamp).toLocaleTimeString();
  }

  static formatDate(timestamp: string): string {
    return new Date(timestamp).toLocaleDateString();
  }

  static formatDateTime(timestamp: string): string {
    return new Date(timestamp).toLocaleString();
  }

  static getCurrentTimestamp(): string {
    return new Date().toISOString();
  }

  static getTimeAgo(timestamp: string): string {
    const now = new Date();
    const past = new Date(timestamp);
    const diffInSeconds = Math.floor((now.getTime() - past.getTime()) / 1000);

    if (diffInSeconds < 60) {
      return `${diffInSeconds} seconds ago`;
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes} minute${minutes > 1 ? "s" : ""} ago`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours} hour${hours > 1 ? "s" : ""} ago`;
    } else {
      const days = Math.floor(diffInSeconds / 86400);
      return `${days} day${days > 1 ? "s" : ""} ago`;
    }
  }

  static isValidTimestamp(timestamp: string): boolean {
    const date = new Date(timestamp);
    return !isNaN(date.getTime());
  }
}

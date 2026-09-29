// ============================================================================
// Quiet Hours Utility
// Respects user quiet periods across timezones (e.g. 22:00 -> 07:30)
// ============================================================================

export interface QuietHoursConfig {
  quiet_hours_start: string; // "22:00:00" or "22:00"
  quiet_hours_end: string;   // "07:30:00" or "07:30"
  timezone?: string;         // e.g. "Asia/Kolkata", "America/New_York", "UTC"
}

/**
 * Converts a time string "HH:MM" or "HH:MM:SS" into minutes from midnight (0 - 1439).
 */
export function timeStringToMinutes(timeStr: string): number {
  const parts = timeStr.split(':');
  const hours = parseInt(parts[0] || '0', 10);
  const minutes = parseInt(parts[1] || '0', 10);
  return hours * 60 + minutes;
}

/**
 * Checks whether the current time in the user's timezone is within quiet hours.
 * Handles overnight time ranges (e.g. 22:00 to 07:30 crosses midnight).
 */
export function isCurrentlyInQuietHours(config: QuietHoursConfig, testDate: Date = new Date()): boolean {
  try {
    const tz = config.timezone || 'UTC';
    
    // Format testDate in the target timezone to get local hours and minutes
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hour: 'numeric',
      minute: 'numeric',
      hour12: false,
    });

    const parts = formatter.formatToParts(testDate);
    const hourPart = parts.find(p => p.type === 'hour')?.value || '0';
    const minutePart = parts.find(p => p.type === 'minute')?.value || '0';
    const currentMinutes = parseInt(hourPart, 10) * 60 + parseInt(minutePart, 10);

    const startMinutes = timeStringToMinutes(config.quiet_hours_start);
    const endMinutes = timeStringToMinutes(config.quiet_hours_end);

    if (startMinutes <= endMinutes) {
      // Same-day window (e.g. 13:00 to 15:00)
      return currentMinutes >= startMinutes && currentMinutes < endMinutes;
    } else {
      // Overnight window (e.g. 22:00 to 07:30)
      // True if >= 22:00 OR < 07:30
      return currentMinutes >= startMinutes || currentMinutes < endMinutes;
    }
  } catch (err) {
    // If timezone is invalid or formatting fails, default to false
    return false;
  }
}

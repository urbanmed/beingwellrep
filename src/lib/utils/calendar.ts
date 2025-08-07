interface CalendarEvent {
  title: string;
  description?: string;
  location?: string;
  startDate: Date;
  endDate: Date;
  allDay?: boolean;
}

export function generateICSFile(event: CalendarEvent): string {
  const formatDate = (date: Date): string => {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };

  const formatDateOnly = (date: Date): string => {
    return date.toISOString().split('T')[0].replace(/-/g, '');
  };

  const escapeText = (text: string): string => {
    return text.replace(/[,;\\]/g, '\\$&').replace(/\n/g, '\\n');
  };

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Health Vault//Medical Appointment//EN',
    'BEGIN:VEVENT',
    `UID:${Date.now()}@healthvault.com`,
    `DTSTAMP:${formatDate(new Date())}`,
  ];

  if (event.allDay) {
    lines.push(`DTSTART;VALUE=DATE:${formatDateOnly(event.startDate)}`);
    lines.push(`DTEND;VALUE=DATE:${formatDateOnly(event.endDate)}`);
  } else {
    lines.push(`DTSTART:${formatDate(event.startDate)}`);
    lines.push(`DTEND:${formatDate(event.endDate)}`);
  }

  lines.push(`SUMMARY:${escapeText(event.title)}`);

  if (event.description) {
    lines.push(`DESCRIPTION:${escapeText(event.description)}`);
  }

  if (event.location) {
    lines.push(`LOCATION:${escapeText(event.location)}`);
  }

  lines.push('END:VEVENT');
  lines.push('END:VCALENDAR');

  return lines.join('\r\n');
}

export function downloadICSFile(event: CalendarEvent, filename?: string): void {
  const icsContent = generateICSFile(event);
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename || `${event.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
}

export function addToDeviceCalendar(event: CalendarEvent): void {
  const startTime = event.startDate.getTime();
  const endTime = event.endDate.getTime();
  
  // Try native mobile calendar first
  if ('calendar' in window) {
    try {
      // @ts-ignore - This is a native mobile API
      window.calendar.createEvent(
        event.title,
        event.location || '',
        event.description || '',
        startTime,
        endTime
      );
      return;
    } catch (error) {
      console.log('Native calendar not available, falling back to ICS download');
    }
  }

  // Fallback to ICS download
  downloadICSFile(event);
}

export function createGoogleCalendarUrl(event: CalendarEvent): string {
  const formatGoogleDate = (date: Date): string => {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${formatGoogleDate(event.startDate)}/${formatGoogleDate(event.endDate)}`,
  });

  if (event.description) {
    params.append('details', event.description);
  }

  if (event.location) {
    params.append('location', event.location);
  }

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
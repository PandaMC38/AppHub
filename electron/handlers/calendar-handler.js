const { ipcMain } = require('electron');
const ical = require('node-ical');

function setupCalendarHandlers() {
    ipcMain.handle('get-calendar-events', async (event, icalUrl) => {
        if (!icalUrl) return [];

        try {
            // For web ics urls, we can use ical.fromURL
            // BUT node-ical's async/sync api is a bit messy. 
            // async.fromURL returns a promise.

            const events = await ical.async.fromURL(icalUrl);
            const upcomingEvents = [];
            const now = new Date();
            // Look up to 1 month ahead
            const future = new Date();
            future.setDate(future.getDate() + 30);

            for (const k in events) {
                const ev = events[k];
                if (ev.type === 'VEVENT') {
                    // Handle simple events
                    if (ev.start >= now && ev.start <= future) {
                        upcomingEvents.push({
                            title: ev.summary,
                            start: ev.start,
                            end: ev.end,
                            location: ev.location,
                            description: ev.description
                        });
                    }

                    // Handle recurring events (RRule)
                    // node-ical handles rrules if we use the properties correctly, 
                    // but often it requires expanding them manually using the `rrule` library.
                    // However, node-ical often provides basic recurrence handling or we might need to rely on 'recurrence-expansion' logic.
                    // For V1 "MVP", let's stick to non-recurring + basic recurring if node-ical expands them (it usually doesn't output instances automatically).
                    // If the user needs recurring events, we'd typically need the 'rrule' package.
                    // Let's stick to basic events first to keep it simple, or check if 'rrule' is included in node-ical (it is as a dep).

                    if (ev.rrule) {
                        try {
                            // Basic handling: check if an occurrence falls in our range
                            // We can use ev.rrule.between(now, future)
                            const occurrences = ev.rrule.between(now, future);
                            occurrences.forEach(date => {
                                upcomingEvents.push({
                                    title: ev.summary,
                                    start: date,
                                    end: new Date(date.getTime() + (ev.end - ev.start)), // Approx duration
                                    location: ev.location,
                                    isRecurring: true
                                });
                            });
                        } catch (e) { /* rrule error? */ }
                    }
                }
            }

            // Sort by Date
            upcomingEvents.sort((a, b) => a.start - b.start);

            // Return sanitized (dates to strings for IPC)
            return upcomingEvents.map(e => ({
                ...e,
                start: e.start.toISOString(),
                end: e.end ? e.end.toISOString() : null
            })).slice(0, 10); // Limit to top 10

        } catch (error) {
            console.error("Calendar Error:", error);
            throw error; // Let frontend handle
        }
    });
}

module.exports = { setupCalendarHandlers };

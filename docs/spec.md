# Durger King Reservations Bot — Refined brief

## Summary
A friendly Telegram bot that takes and manages table reservations for Durger King. Guests pick a date, an available time slot and party size; the bot only shows actually available slots (checked against real tables), confirms instantly, sends a reminder 2 hours before the booking, and lets guests cancel or reschedule from inline buttons. The owner receives timely notifications and can view and manage upcoming bookings from an admin interface in Telegram.

## Audience
- Guests who use Telegram and want to reserve tables at Durger King.
- Restaurant staff / owner who need a clear list of upcoming bookings, capacity at-a-glance, and quick no-show alerts.

## Core entities
- Table: id, seats (inventory: 2 tables of 2 seats; 4 tables of 4 seats).
- Booking: id, date, start_time, end_time (start + 90 min), party_size, assigned_table_id, status (booked, arrived, cancelled, rescheduled, no-show), guest_name, guest_phone, guest_telegram_id, created_at, updated_at.
- User (guest): telegram_id, name, phone (optional if Telegram contact shared).
- Admin settings: operating hours, timezone, booking window, owner_telegram_id, reminders config.
- System events: reminders sent, cancellations, reschedules, no-show flags.

## Integrations & notification targets
- Telegram Bot API (primary UI for guests + admin). Use a modern Telegraf/grammy-based implementation.
- PostgreSQL for persistent storage.
- Redis (or built-in job scheduler) for delayed jobs (reminder and no-show detection queues).
- Optional: webhook endpoint to push booking events to third-party systems (configurable later).
- Owner/admin notifications: sent to a configured owner Telegram account (owner_telegram_id). Admin commands are available inside the bot for the owner.

## Interaction flows (guest)
1. User opens bot (/start) or taps a persistent "Reserve a table" button.
2. Bot asks for date via inline calendar (show days up to booking window).
3. Bot computes and shows only available time slots for the selected date (slots are start times spaced by 15-minute granularity, filtered so no table would be double-booked for the 90-minute duration). Times are shown as inline buttons.
4. User selects a time -> bot asks party size (1–4). The bot will only show party sizes that can be seated given table inventory and the chosen time.
5. Bot requests guest name and phone (phone can be provided by sharing Telegram contact or typed). Guest Telegram account is recorded automatically.
6. Bot assigns the smallest single table that fits the party and creates the booking. Confirmation message is shown immediately (warm, clear summary + booking ID) with inline buttons: "Cancel booking", "Reschedule", "My bookings".
7. A reminder message is sent to the guest 2 hours before the booking.
8. If guest cancels or reschedules, the bot re-checks availability and updates booking and owner notifications. Reschedule uses the same calendar/time selection flow.

## Interaction flows (owner / admin)
- Owner setup: configure owner Telegram ID (first admin who starts bot gets admin role), timezone (default configurable), and booking window.
- Admin commands inside bot: /bookings_today (list), /bookings_date YYYY-MM-DD, /capacity_today (summary of table occupancy and free tables), /no_shows (recently flagged), and quick actions to mark "Arrived", "Cancel", or "Reschedule".
- When a booking is made/cancelled/no-show, the bot posts a concise notification to the owner Telegram chat.

## Availability & allocation rules
- Opening hours: 10:00–22:00 local restaurant time (owner provided).
- Reservation length: 90 minutes per booking.
- Slot granularity: 15 minutes.
- Last possible start time = 22:00 - 90 minutes = 20:30.
- Table inventory: two 2-seat tables and four 4-seat tables.
- Allocation strategy: assign the smallest single table that fits the party size (no automatic table combining). If no single table can fit the party at the chosen time, that time is treated as unavailable for that party size.
- Max party size via bot UI = 4 (parties larger than 4 are out-of-scope for automatic booking and should be asked to call the restaurant).

## Reminders and no-show handling
- Guest reminder: automatic Telegram message 2 hours before reservation start.
- No-show detection: if a booking is not marked "Arrived" within 30 minutes after scheduled start, the system marks it as "no-show" and notifies the owner.
- Staff can mark a booking as Arrived from the admin view to prevent a no-show flag.

## Cancellation & reschedule policy (configurable)
- Default: guests may cancel or reschedule up to 1 hour before the scheduled start using inline buttons (owner can change this in settings).

## Persistence
- PostgreSQL schema with tables: tables, bookings, users, admin_settings, jobs/audit.
- Indexed by date and status for quick daily queries.
- Bookings must store guest contact (phone and telegram id) and booking metadata required for admin view and reminders.
- Scheduled jobs: reminders and no-show checks orchestrated via Redis + worker or internal scheduler (cron + job table).

## Payments
- No deposit or payment integration (owner selected "No deposit").

## Non-goals
- Automatic combining of multiple tables to seat a single party (large-party logic is out-of-scope).
- POS integration, third-party reservation platform sync, or payment processing (not included in initial build).
- Handling walk-ins or waitlist management.

## Security & privacy
- Guest details are private: only visible to owner/admin accounts and the guest who created the booking.
- Store minimal PII (name, phone, telegram_id) and protect database access credentials; TLS required for webhooks and admin endpoints.

## Operational choices (implementation stack & hosting)
- Bot framework: Node.js + Telegraf or grammy (TypeScript recommended).
- Database: PostgreSQL.
- Job queue: Redis for delayed jobs or server-side scheduler + jobs table.
- Hosting: any cloud (DigitalOcean/Heroku/AWS) with secure config; containerized deployment recommended.

## Assumptions & defaults
- Booking window: 60 days by default — gives guests flexibility while keeping availability manageable and is configurable in admin settings.
- Timezone: default to the restaurant/server timezone (configurable) — timezone must be set during initial admin setup so slot calculations are correct.
- Max party size: 4 (matches the largest single table) — we will treat larger parties as "call us" to avoid automatic table combining.
- Slot granularity: 15 minutes — balances guest convenience and precise availability calculation for 90-minute bookings.
- No table combining: bookings allocate a single table only to keep allocation deterministic and avoid complex layout logic.
- Owner notifications: sent to a configured owner Telegram account (owner_telegram_id) and managed via bot-admin commands — simplest secure channel for realtime alerts.


If you want any of the defaults changed (timezone, max party size, booking window, cancellation cutoff, or allowing table combinations), tell me which one to change and I will regenerate the brief with that choice.
"use client";

import { FormEvent, useState } from "react";

type ReservationHours = {
  day_of_week: number;
  label: string;
  open_time: string | null;
  close_time: string | null;
  is_closed: number;
};

function getLatestBookingTime(closeTime: string): string {
  const [hours, minutes] = closeTime.split(":").map(Number);
  const closingMinutes = hours * 60 + minutes - 1;
  return `${String(Math.floor(closingMinutes / 60)).padStart(2, "0")}:${String(closingMinutes % 60).padStart(2, "0")}`;
}

export default function ReservationForm({
  openingHours,
  initialDate,
  latestDate,
  firstAvailableTime,
}: {
  openingHours: ReservationHours[];
  initialDate: string;
  latestDate: string;
  firstAvailableTime: string;
}) {
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [date, setDate] = useState(initialDate);
  const selectedDay = new Date(`${date}T12:00:00.000Z`).getUTCDay();
  const selectedHours = openingHours.find((hours) => hours.day_of_week === selectedDay);
  const isSelectedDayClosed =
    !selectedHours ||
    Boolean(selectedHours.is_closed) ||
    !selectedHours.open_time ||
    !selectedHours.close_time;
  const latestBookingTime =
    !isSelectedDayClosed && selectedHours.close_time
      ? getLatestBookingTime(selectedHours.close_time)
      : "";
  const isSameDay = date === initialDate;
  const earliestBookingTime =
    !isSelectedDayClosed && selectedHours.open_time
      ? isSameDay && selectedHours.open_time < firstAvailableTime
        ? firstAvailableTime
        : selectedHours.open_time
      : "";
  const hasNoRemainingTimes =
    !isSelectedDayClosed && earliestBookingTime > latestBookingTime;
  const reservationUnavailable = isSelectedDayClosed || hasNoRemainingTimes;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setMessage("");
    setIsSubmitting(true);

    const formData = new FormData(form);
    const payload = Object.fromEntries(formData.entries());

    try {
      const response = await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();

      if (!response.ok) {
        setMessage(result.error ?? "We couldn't make that booking. Please try again.");
        return;
      }

      form.reset();
      setMessage("Thanks! Your request is in. We'll be in touch to confirm your table.");
    } catch {
      setMessage("We couldn't reach the restaurant just now. Please try again shortly.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="reservation-form" onSubmit={handleSubmit}>
      <div className="form-heading">
        <span>LET’S GET YOU BOOKED</span>
        <span>✳</span>
      </div>
      <label>
        YOUR NAME
        <input name="name" autoComplete="name" placeholder="How should we greet you?" required maxLength={100} />
      </label>
      <label className="honeypot-field" aria-hidden="true">
        WEBSITE
        <input name="website" tabIndex={-1} autoComplete="off" />
      </label>
      <div className="form-row">
        <label>
          PHONE NUMBER
          <input name="phone" type="tel" autoComplete="tel" placeholder="+92 300 1234567" required maxLength={30} />
        </label>
        <label>
          GUESTS
          <select name="guests" defaultValue="2" required>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((number) => (
              <option value={number} key={number}>{number} {number === 1 ? "guest" : "guests"}</option>
            ))}
          </select>
        </label>
      </div>
      <div className="form-row">
        <label>
          DATE
          <input
            name="date"
            type="date"
            min={initialDate}
            max={latestDate}
            value={date}
            onChange={(event) => setDate(event.target.value)}
            required
          />
        </label>
        <label>
          TIME
          <input
            name="time"
            type="time"
            min={!reservationUnavailable ? earliestBookingTime : undefined}
            max={!reservationUnavailable ? latestBookingTime : undefined}
            step={900}
            disabled={reservationUnavailable}
            required
          />
        </label>
      </div>
      <p className={`booking-hours-note${reservationUnavailable ? " booking-hours-closed" : ""}`} aria-live="polite">
        {isSelectedDayClosed
          ? `${selectedHours?.label ?? "This day"} is closed. Please choose another date.`
          : hasNoRemainingTimes
            ? "Today's booking times have passed. Please choose another date."
            : `Available ${earliestBookingTime}–${latestBookingTime}; bookings are confirmed by phone.`}
      </p>
      <label>
        A LITTLE NOTE <span className="optional">(OPTIONAL)</span>
        <input name="note" placeholder="A special occasion, a favourite table…" maxLength={500} />
      </label>
      <button className="button button-gold form-submit" type="submit" disabled={isSubmitting || reservationUnavailable}>
        {isSubmitting ? "Sending your request…" : "Request a reservation"} <span aria-hidden="true">↗</span>
      </button>
      <p className={`form-message${message.startsWith("Thanks") ? " form-message-success" : ""}`} aria-live="polite">
        {message || "We’ll contact you to confirm your reservation."}
      </p>
    </form>
  );
}

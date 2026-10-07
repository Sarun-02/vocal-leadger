package com.vocalledger.app.payments;

/**
 * Turns the text of a notification from one payment app into a structured payment.
 *
 * Implementations must be pure (no Android APIs, no I/O, no logging of content) and must
 * return {@code null} whenever the notification is not confidently an completed transaction:
 * OTPs, security alerts, promotions, requests, reminders, failures and anything ambiguous.
 *
 * To support another app (PhonePe, Paytm, a bank app…), add a parser and register it in
 * {@link NotificationSourceDetector#defaultSources()}.
 */
public interface PaymentNotificationParser {

    /** Minimum confidence for a result to be returned. */
    double CONFIDENCE_THRESHOLD = 0.7;

    ParsedPayment parse(NotificationContent content);
}

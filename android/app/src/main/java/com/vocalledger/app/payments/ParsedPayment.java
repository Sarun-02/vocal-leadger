package com.vocalledger.app.payments;

/** Structured result of parsing a payment notification. Contains no raw notification text. */
public final class ParsedPayment {

    public enum Direction {
        PAYMENT,
        RECEIVED,
    }

    public final Direction direction;
    /** Amount in paise (1 rupee = 100 paise). Always positive. */
    public final long amountPaise;
    /** Merchant / recipient for payments, sender for received money. May be null when not shown. */
    public final String counterparty;
    /** 0..1 — how sure the parser is. Callers only accept results at or above the parser threshold. */
    public final double confidence;

    public ParsedPayment(Direction direction, long amountPaise, String counterparty, double confidence) {
        this.direction = direction;
        this.amountPaise = amountPaise;
        this.counterparty = counterparty;
        this.confidence = confidence;
    }

    @Override
    public String toString() {
        // Sanitised: safe for debug logs (no counterparty name).
        return "ParsedPayment[" + direction + ", paise=" + amountPaise + ", confidence=" + confidence + "]";
    }
}

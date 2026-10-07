package com.vocalledger.app.payments;

/**
 * The visible text of one notification, held in memory only while it is being parsed.
 *
 * PRIVACY: instances must never be persisted, logged, or passed to the web layer.
 * Only the structured {@link ParsedPayment} that a parser extracts leaves the parser.
 */
public final class NotificationContent {

    public final String title;
    public final String text;
    public final String bigText;

    public NotificationContent(String title, String text, String bigText) {
        this.title = title == null ? "" : title;
        this.text = text == null ? "" : text;
        this.bigText = bigText == null ? "" : bigText;
    }

    /** Title and body joined with a sentence break; the expanded text wins over the short text. */
    public String combined() {
        String body = bigText.trim().length() >= text.trim().length() ? bigText : text;
        String t = title.trim();
        String b = body.trim();
        if (t.isEmpty()) return b;
        if (b.isEmpty() || b.equalsIgnoreCase(t)) return t;
        return t + " . " + b;
    }

    @Override
    public String toString() {
        // Never expose content through logging or debugging output.
        return "NotificationContent[redacted]";
    }
}

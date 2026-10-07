package com.vocalledger.app.payments;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Maps a notification's package name to the payment source that can parse it.
 * Notifications from any other package (WhatsApp, Gmail, Messages, bank apps…) are rejected
 * before their content is ever read.
 */
public final class NotificationSourceDetector {

    public static final String GOOGLE_PAY = "GOOGLE_PAY";

    /** Google Pay India, and Google Wallet / Google Pay in other regions. */
    public static final Set<String> DEFAULT_GOOGLE_PAY_PACKAGES = Collections.unmodifiableSet(
        new LinkedHashSet<>(Arrays.asList("com.google.android.apps.nbu.paisa.user", "com.google.android.apps.walletnfcrel"))
    );

    private final List<PaymentSource> sources;

    public NotificationSourceDetector(List<PaymentSource> sources) {
        this.sources = Collections.unmodifiableList(new ArrayList<>(sources));
    }

    /**
     * Built-in sources. Only Google Pay for now — add e.g. a PhonePe source here later.
     *
     * @param packageOverrides optional per-source package lists (source id → packages); missing or
     *                         empty entries fall back to the defaults.
     */
    public static NotificationSourceDetector defaultSources(Map<String, Set<String>> packageOverrides) {
        List<PaymentSource> list = new ArrayList<>();
        PaymentSource gpay = new PaymentSource(GOOGLE_PAY, "Google Pay", DEFAULT_GOOGLE_PAY_PACKAGES, new GooglePayParser());
        Set<String> override = packageOverrides == null ? null : packageOverrides.get(GOOGLE_PAY);
        list.add(override == null || override.isEmpty() ? gpay : gpay.withPackages(override));
        return new NotificationSourceDetector(list);
    }

    /** The source for this package, or null when the package is not a supported payment app. */
    public PaymentSource detect(String packageName) {
        if (packageName == null || packageName.isEmpty()) return null;
        for (PaymentSource s : sources) {
            if (s.packages.contains(packageName)) return s;
        }
        return null;
    }

    public PaymentSource byId(String id) {
        for (PaymentSource s : sources) {
            if (s.id.equals(id)) return s;
        }
        return null;
    }
}

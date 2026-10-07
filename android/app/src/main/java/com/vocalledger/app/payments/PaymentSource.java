package com.vocalledger.app.payments;

import java.util.Collections;
import java.util.LinkedHashSet;
import java.util.Set;

/** A payment app whose notifications can be parsed (e.g. Google Pay). */
public final class PaymentSource {

    /** Stable id stored with detected transactions, e.g. "GOOGLE_PAY". */
    public final String id;
    public final String displayName;
    /** Android package names that post this app's notifications. */
    public final Set<String> packages;
    public final PaymentNotificationParser parser;

    public PaymentSource(String id, String displayName, Set<String> packages, PaymentNotificationParser parser) {
        this.id = id;
        this.displayName = displayName;
        this.packages = Collections.unmodifiableSet(new LinkedHashSet<>(packages));
        this.parser = parser;
    }

    public PaymentSource withPackages(Set<String> newPackages) {
        return new PaymentSource(id, displayName, newPackages, parser);
    }
}

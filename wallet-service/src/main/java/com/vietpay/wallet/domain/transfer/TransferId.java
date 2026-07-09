package com.vietpay.wallet.domain.transfer;

import java.util.Objects;
import java.util.UUID;

/** Strongly-typed transfer identity. */
public record TransferId(UUID value) {

    public TransferId {
        Objects.requireNonNull(value, "transfer id");
    }

    public static TransferId newId() {
        return new TransferId(UUID.randomUUID());
    }

    public static TransferId of(UUID value) {
        return new TransferId(value);
    }

    @Override
    public String toString() {
        return value.toString();
    }
}

package com.vietpay.wallet.domain.wallet;

import java.util.Objects;
import java.util.UUID;

/** Strongly-typed wallet identity. */
public record WalletId(UUID value) {

    public WalletId {
        Objects.requireNonNull(value, "wallet id");
    }

    public static WalletId of(UUID value) {
        return new WalletId(value);
    }

    public static WalletId newId() {
        return new WalletId(UUID.randomUUID());
    }

    @Override
    public String toString() {
        return value.toString();
    }
}
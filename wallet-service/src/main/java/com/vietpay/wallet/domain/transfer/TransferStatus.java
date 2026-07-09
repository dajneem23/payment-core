package com.vietpay.wallet.domain.transfer;

/** Terminal status of a transfer. A persisted transfer is always in an end
 *  state — the money either moved (COMPLETED) or it did not (FAILED); there is
 *  no in-flight state because the movement is one atomic transaction. */
public enum TransferStatus {
    COMPLETED,
    FAILED
}

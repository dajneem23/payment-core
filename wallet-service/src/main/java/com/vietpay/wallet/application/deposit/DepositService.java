package com.vietpay.wallet.application.deposit;

import com.vietpay.wallet.application.transfer.TransferCommand;
import com.vietpay.wallet.application.transfer.TransferResult;
import com.vietpay.wallet.application.transfer.TransferService;
import com.vietpay.wallet.domain.exception.WalletCurrencyNotSupportedException;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.UUID;

/**
 * Deposit use case — money entering the system from outside.
 *
 * <p>A deposit is a transfer from the per-currency SYSTEM funding account into
 * the user's wallet ({@code DEBIT funding, CREDIT wallet}). Delegating to
 * {@link TransferService} reuses its idempotency, row-locking, double-entry
 * ledger and outbox — a deposit gets the exact same correctness guarantees as a
 * transfer, with no duplicated money-movement code.
 *
 * <p>In production this endpoint would be driven by a payment-provider webhook
 * confirming an external credit (card/bank), not called directly by a client.
 */
@Service
public class DepositService {

    /** Funding account ids seeded in V4, keyed by currency. */
    private static final Map<String, UUID> FUNDING_ACCOUNTS = Map.of(
        "USD", UUID.fromString("00000000-0000-0000-0000-000000000010"),
        "EUR", UUID.fromString("00000000-0000-0000-0000-000000000011"),
        "VND", UUID.fromString("00000000-0000-0000-0000-000000000012"),
        "GBP", UUID.fromString("00000000-0000-0000-0000-000000000013"));

    private final TransferService transferService;

    public DepositService(TransferService transferService) {
        this.transferService = transferService;
    }

    public TransferResult deposit(DepositCommand cmd) {
        UUID fundingAccount = FUNDING_ACCOUNTS.get(cmd.currency());
        if (fundingAccount == null) {
            throw new WalletCurrencyNotSupportedException(cmd.currency());
        }
        // Funding account -> wallet. The transfer path enforces that the wallet's
        // currency matches cmd.currency, so a mismatch is rejected consistently.
        return transferService.transfer(new TransferCommand(
            cmd.idempotencyKey(), fundingAccount, cmd.walletId(), cmd.amount(), cmd.currency()));
    }
}

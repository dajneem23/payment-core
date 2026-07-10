package com.vietpay.wallet.api;

import com.vietpay.wallet.api.dto.CreateWalletRequest;
import com.vietpay.wallet.api.dto.DepositRequest;
import com.vietpay.wallet.api.dto.DepositResponse;
import com.vietpay.wallet.api.dto.TransactionResponse;
import com.vietpay.wallet.api.dto.WalletResponse;
import com.vietpay.wallet.application.deposit.DepositCommand;
import com.vietpay.wallet.application.deposit.DepositService;
import com.vietpay.wallet.application.wallet.WalletService;
import com.vietpay.wallet.domain.exception.ForbiddenException;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

/** Wallet accounts: open a wallet, query balance/history/reconciliation, deposit. */
@RestController
@RequestMapping("/api/v1/wallets")
public class WalletController {

    private final WalletService walletService;
    private final DepositService depositService;

    public WalletController(WalletService walletService, DepositService depositService) {
        this.walletService = walletService;
        this.depositService = depositService;
    }

    @PostMapping
    public ResponseEntity<WalletResponse> create(@Valid @RequestBody CreateWalletRequest request) {
        WalletResponse body = WalletResponse.from(walletService.create(request.currency()));
        return ResponseEntity.status(HttpStatus.CREATED).body(body);
    }

    /**
     * Fund a wallet from an external source. ADMIN-only (a treasury/ops action,
     * standing in for a payment-provider webhook) — the caller's role arrives as
     * the X-User-Role header, set by Traefik ForwardAuth and un-spoofable
     * (inbound copies are stripped at the edge). Safe to retry via Idempotency-Key.
     */
    @PostMapping("/{id}/deposits")
    public ResponseEntity<DepositResponse> deposit(
            @PathVariable UUID id,
            @RequestHeader("Idempotency-Key") String idempotencyKey,
            @RequestHeader(value = "X-User-Role", required = false) String role,
            @Valid @RequestBody DepositRequest request) {
        if (!"ADMIN".equals(role)) {
            throw new ForbiddenException("deposit requires ADMIN role");
        }
        DepositResponse body = DepositResponse.from(depositService.deposit(
            new DepositCommand(idempotencyKey, id, request.amount(), request.currency())));
        return ResponseEntity.status(HttpStatus.CREATED).body(body);
    }

    @GetMapping("/{id}")
    @ResponseStatus(HttpStatus.OK)
    public WalletResponse get(@PathVariable UUID id) {
        return WalletResponse.from(walletService.get(id));
    }

    @GetMapping("/{id}/transactions")
    @ResponseStatus(HttpStatus.OK)
    public List<TransactionResponse> transactions(
            @PathVariable UUID id,
            @RequestParam(defaultValue = "20") int limit,
            @RequestParam(defaultValue = "0") int offset) {
        return walletService.transactions(id, limit, offset).stream()
            .map(TransactionResponse::from)
            .toList();
    }

    /** Prove the cached balance equals the ledger's sum (the ledger is truth). */
    @GetMapping("/{id}/reconciliation")
    @ResponseStatus(HttpStatus.OK)
    public WalletService.Reconciliation reconcile(@PathVariable UUID id) {
        return walletService.reconcile(id);
    }
}

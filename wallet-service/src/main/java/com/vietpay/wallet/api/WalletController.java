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
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
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
@Tag(name = "Wallets", description = "Open wallets and read their balance, history and reconciliation")
public class WalletController {

    private final WalletService walletService;
    private final DepositService depositService;

    public WalletController(WalletService walletService, DepositService depositService) {
        this.walletService = walletService;
        this.depositService = depositService;
    }

    @GetMapping
    @ResponseStatus(HttpStatus.OK)
    @Operation(summary = "List my wallets",
        description = "Returns every wallet owned by the authenticated caller.")
    public List<WalletResponse> list(
            @Parameter(description = "Caller's user id (set by the gateway from your JWT)")
            @RequestHeader("X-User-Id") String userId) {
        return walletService.listByOwner(userId).stream()
            .map(WalletResponse::from)
            .toList();
    }

    @PostMapping
    @Operation(summary = "Open a wallet",
        description = "Creates a new, empty wallet in the given currency, owned by the caller.")
    @ApiResponses({
        @ApiResponse(responseCode = "201", description = "Wallet created"),
        @ApiResponse(responseCode = "400", description = "Malformed currency code"),
        @ApiResponse(responseCode = "422", description = "Currency is valid ISO but not supported")})
    public ResponseEntity<WalletResponse> create(
            @Parameter(description = "Caller's user id (set by the gateway from your JWT)")
            @RequestHeader("X-User-Id") String userId,
            @Valid @RequestBody CreateWalletRequest request) {
        WalletResponse body = WalletResponse.from(walletService.create(request.currency(), userId));
        return ResponseEntity.status(HttpStatus.CREATED).body(body);
    }

    /**
     * Fund a wallet from an external source. ADMIN-only (a treasury/ops action,
     * standing in for a payment-provider webhook) — the caller's role arrives as
     * the X-User-Role header, set by Traefik ForwardAuth and un-spoofable
     * (inbound copies are stripped at the edge). Safe to retry via Idempotency-Key.
     */
    @PostMapping("/{id}/deposits")
    @Operation(summary = "Deposit into a wallet (ADMIN)",
        description = "Funds a wallet from a system account — an admin/treasury action standing in "
            + "for a payment-provider credit. Requires the ADMIN role. Retry-safe via Idempotency-Key.")
    @ApiResponses({
        @ApiResponse(responseCode = "201", description = "Deposit applied (or replayed)"),
        @ApiResponse(responseCode = "403", description = "Caller is not an ADMIN"),
        @ApiResponse(responseCode = "404", description = "Wallet not found"),
        @ApiResponse(responseCode = "422", description = "Currency mismatch or unsupported")})
    public ResponseEntity<DepositResponse> deposit(
            @Parameter(description = "Wallet to fund") @PathVariable UUID id,
            @Parameter(description = "Unique key so retries don't double-credit",
                example = "22222222-2222-2222-2222-222222222222")
            @RequestHeader("Idempotency-Key") String idempotencyKey,
            @Parameter(description = "Caller's role (set by the gateway). Must be ADMIN.")
            @RequestHeader(value = "X-User-Role", required = false) String role,
            @Parameter(description = "Caller's user id (set by the gateway from your JWT)")
            @RequestHeader("X-User-Id") String userId,
            @Valid @RequestBody DepositRequest request) {
        //todo: handle role check more efficiently, maybe with a custom annotation or a filter
        if (!"ADMIN".equals(role)) {
            throw new ForbiddenException("deposit requires ADMIN role");
        }
        DepositResponse body = DepositResponse.from(depositService.deposit(
            new DepositCommand(idempotencyKey, id, request.amount(), request.currency(), request.remark()),
            userId));
        return ResponseEntity.status(HttpStatus.CREATED).body(body);
    }

    @GetMapping("/{id}")
    @ResponseStatus(HttpStatus.OK)
    @Operation(summary = "Get a wallet",
        description = "Returns the wallet's current balance and currency.")
    @ApiResponses(@ApiResponse(responseCode = "404", description = "Wallet not found"))
    public WalletResponse get(@Parameter(description = "Wallet id") @PathVariable UUID id) {
        return WalletResponse.from(walletService.get(id));
    }

    @GetMapping("/{id}/transactions")
    @ResponseStatus(HttpStatus.OK)
    @Operation(summary = "List a wallet's transaction history",
        description = "Most-recent-first ledger entries for the wallet. Each row's sourceType tells "
            + "you whether it came from a TRANSFER or a card PAYMENT, and sourceRef links back to it.")
    public List<TransactionResponse> transactions(
            @Parameter(description = "Wallet id") @PathVariable UUID id,
            @Parameter(description = "Max entries to return") @RequestParam(defaultValue = "20") int limit,
            @Parameter(description = "Entries to skip (paging)") @RequestParam(defaultValue = "0") int offset) {
        return walletService.transactions(id, limit, offset).stream()
            .map(TransactionResponse::from)
            .toList();
    }

    /** Prove the cached balance equals the ledger's sum (the ledger is truth). */
    @GetMapping("/{id}/reconciliation")
    @ResponseStatus(HttpStatus.OK)
    @Operation(summary = "Reconcile a wallet",
        description = "Proves the wallet's cached balance equals the sum of its ledger entries "
            + "(credits − debits). `balanced: true` means the ledger backs the balance.")
    public WalletService.Reconciliation reconcile(
            @Parameter(description = "Wallet id") @PathVariable UUID id) {
        return walletService.reconcile(id);
    }
}

package com.vietpay.wallet.api;

import com.vietpay.wallet.api.dto.TransferDetailResponse;
import com.vietpay.wallet.api.dto.TransferRequest;
import com.vietpay.wallet.api.dto.TransferResponse;
import com.vietpay.wallet.application.transfer.TransferCommand;
import com.vietpay.wallet.application.transfer.TransferService;
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
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

/** Money transfer between two wallets. Safe to retry via the Idempotency-Key
 *  header — the same key moves money at most once. */
@RestController
@RequestMapping("/api/v1/transfers")
@Tag(name = "Transfers", description = "Move money between wallets — idempotent and overdraw-safe")
public class TransferController {

    private final TransferService transferService;

    public TransferController(TransferService transferService) {
        this.transferService = transferService;
    }

    @PostMapping
    @Operation(summary = "Send money to another wallet",
        description = "Moves the amount from the source wallet to the destination wallet in one "
            + "atomic double-entry posting. Retry-safe: sending the same Idempotency-Key again "
            + "moves money at most once and returns the original result.")
    @ApiResponses({
        @ApiResponse(responseCode = "201", description = "Transfer completed (or the original result replayed)"),
        @ApiResponse(responseCode = "400", description = "Invalid request body"),
        @ApiResponse(responseCode = "403", description = "Caller does not own the source wallet"),
        @ApiResponse(responseCode = "404", description = "Source or destination wallet not found"),
        @ApiResponse(responseCode = "409", description = "Idempotency-Key already used for a different request"),
        @ApiResponse(responseCode = "422", description = "Insufficient funds, or currency mismatch")})
    public ResponseEntity<TransferResponse> transfer(
            @Parameter(description = "Unique key so retries don't double-move money",
                example = "11111111-1111-1111-1111-111111111111")
            @RequestHeader("Idempotency-Key") String idempotencyKey,
            @Parameter(description = "Caller's user id (set by the gateway from your JWT)")
            @RequestHeader("X-User-Id") String userId,
            @Valid @RequestBody TransferRequest request) {
        TransferResponse body = TransferResponse.from(transferService.transfer(
            new TransferCommand(idempotencyKey, request.sourceWalletId(),
                request.destWalletId(), request.amount(), request.currency(), request.remark()),
            userId));
        return ResponseEntity.status(HttpStatus.CREATED).body(body);
    }

    /**
     * Fetch a single transfer's detail. Only a participant (owner of the source
     * or destination wallet) may view it — the caller's identity arrives as the
     * X-User-Id header set by Traefik ForwardAuth. Returns 404 if unknown, 403
     * if the caller is not a participant.
     */
    @GetMapping("/{id}")
    @ResponseStatus(HttpStatus.OK)
    @Operation(summary = "Get a transfer by id",
        description = "Returns a transfer's full detail (amount, both wallets, remark, timestamp). "
            + "Only a participant — the owner of the source or destination wallet — may view it.")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "The transfer detail"),
        @ApiResponse(responseCode = "403", description = "Caller is not a participant in this transfer"),
        @ApiResponse(responseCode = "404", description = "Transfer not found")})
    public TransferDetailResponse get(
            @Parameter(description = "Transfer id") @PathVariable UUID id,
            @Parameter(description = "Caller's user id (set by the gateway from your JWT)")
            @RequestHeader("X-User-Id") String userId) {
        return TransferDetailResponse.from(transferService.getTransfer(id, userId));
    }
}

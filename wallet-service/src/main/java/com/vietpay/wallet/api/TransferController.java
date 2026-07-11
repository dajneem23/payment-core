package com.vietpay.wallet.api;

import com.vietpay.wallet.api.dto.TransferDetailResponse;
import com.vietpay.wallet.api.dto.TransferRequest;
import com.vietpay.wallet.api.dto.TransferResponse;
import com.vietpay.wallet.application.transfer.TransferCommand;
import com.vietpay.wallet.application.transfer.TransferService;
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
public class TransferController {

    private final TransferService transferService;

    public TransferController(TransferService transferService) {
        this.transferService = transferService;
    }

    @PostMapping
    public ResponseEntity<TransferResponse> transfer(
            @RequestHeader("Idempotency-Key") String idempotencyKey,
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
    public TransferDetailResponse get(
            @PathVariable UUID id,
            @RequestHeader("X-User-Id") String userId) {
        return TransferDetailResponse.from(transferService.getTransfer(id, userId));
    }
}

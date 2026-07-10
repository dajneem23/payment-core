package com.vietpay.wallet.api;

import com.vietpay.wallet.api.dto.TransferRequest;
import com.vietpay.wallet.api.dto.TransferResponse;
import com.vietpay.wallet.application.transfer.TransferCommand;
import com.vietpay.wallet.application.transfer.TransferService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

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
            @Valid @RequestBody TransferRequest request) {
        TransferResponse body = TransferResponse.from(transferService.transfer(
            new TransferCommand(idempotencyKey, request.sourceWalletId(),
                request.destWalletId(), request.amount(), request.currency())));
        return ResponseEntity.status(HttpStatus.CREATED).body(body);
    }
}

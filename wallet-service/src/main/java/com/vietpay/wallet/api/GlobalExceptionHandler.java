package com.vietpay.wallet.api;

import com.vietpay.wallet.domain.exception.DomainException;
import com.vietpay.wallet.domain.exception.ErrorCode;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.Instant;
import java.util.Map;

/**
 * Single, consistent error model (RFC-7807 {@link ProblemDetail}). Each domain
 * {@link ErrorCode} maps to exactly one HTTP status here, so clients get
 * predictable, structured errors with a stable machine-readable {@code code}.
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    private static final Map<ErrorCode, HttpStatus> STATUS = Map.of(
        ErrorCode.VALIDATION_ERROR, HttpStatus.BAD_REQUEST,
        ErrorCode.WALLET_NOT_FOUND, HttpStatus.NOT_FOUND,
        ErrorCode.PAYMENT_NOT_FOUND, HttpStatus.NOT_FOUND,
        ErrorCode.INSUFFICIENT_FUNDS, HttpStatus.UNPROCESSABLE_ENTITY,
        ErrorCode.CURRENCY_UNSUPPORTED, HttpStatus.UNPROCESSABLE_ENTITY,
        ErrorCode.FRAUD_REJECTED, HttpStatus.UNPROCESSABLE_ENTITY,
        ErrorCode.IDEMPOTENCY_CONFLICT, HttpStatus.CONFLICT,
        ErrorCode.INTERNAL_ERROR, HttpStatus.INTERNAL_SERVER_ERROR);

    @ExceptionHandler(DomainException.class)
    public ProblemDetail handleDomain(DomainException ex) {
        HttpStatus status = STATUS.getOrDefault(ex.code(), HttpStatus.INTERNAL_SERVER_ERROR);
        if (status.is5xxServerError()) {
            log.error("domain error {}", ex.code(), ex);
        }
        return problem(status, ex.code(), ex.getMessage());
    }

    /** Bean-validation failures on request bodies -> 400. */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ProblemDetail handleValidation(MethodArgumentNotValidException ex) {
        String detail = ex.getBindingResult().getFieldErrors().stream()
            .findFirst()
            .map(fe -> fe.getField() + " " + fe.getDefaultMessage())
            .orElse("validation error");
        return problem(HttpStatus.BAD_REQUEST, ErrorCode.VALIDATION_ERROR, detail);
    }

    private static ProblemDetail problem(HttpStatus status, ErrorCode code, String detail) {
        ProblemDetail pd = ProblemDetail.forStatusAndDetail(status, detail);
        pd.setTitle(status.getReasonPhrase());
        pd.setProperty("code", code.name());
        pd.setProperty("timestamp", Instant.now().toString());
        return pd;
    }
}
package com.vietpay.wallet.domain.exception;

/** The caller is authenticated but not permitted to perform this action
 *  (e.g. a non-admin calling an admin-only endpoint). Maps to HTTP 403. */
public class ForbiddenException extends DomainException {
    public ForbiddenException(String message) {
        super(ErrorCode.FORBIDDEN, message);
    }
}

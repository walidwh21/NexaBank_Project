package com.nexabank.api.error;

import java.math.BigDecimal;

/** Raised when a debit would exceed the spendable amount of an account (maps to HTTP 422). */
public class InsufficientFundsException extends RuntimeException {
    public InsufficientFundsException(String accountId, BigDecimal requested, BigDecimal spendable) {
        super("Account " + accountId + " cannot cover " + requested + " (spendable: " + spendable + ")");
    }
}

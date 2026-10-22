package com.nexabank.api.dto;

import com.nexabank.api.domain.AccountKind;
import com.nexabank.api.domain.AccountStatus;
import com.nexabank.api.domain.EntryType;
import jakarta.validation.constraints.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

/** All request/response payloads of the public API, grouped as nested records. */
public final class Dtos {

    private Dtos() {
    }

    // ---- auth ----
    public record LoginRequest(@NotBlank String username, @NotBlank String password) {
    }

    public record LoginResponse(String token, Instant expiresAt, String username, List<String> roles) {
    }

    // ---- customers ----
    public record CustomerRequest(
            @NotBlank @Size(min = 2, max = 120) String fullName,
            @NotBlank @Email @Size(max = 180) String email) {
    }

    public record CustomerResponse(Long id, String fullName, String email, int accountCount, Instant createdAt) {
    }

    // ---- accounts ----
    public record OpenAccountRequest(
            @NotNull AccountKind kind,
            @NotNull Long customerId,
            @NotNull @DecimalMin("0.00") @Digits(integer = 15, fraction = 2) BigDecimal initialDeposit,
            @DecimalMin("0.00") BigDecimal overdraftLimit,
            @DecimalMin("0.00") @DecimalMax("25.00") BigDecimal annualRate) {
    }

    public record AccountResponse(
            String id,
            AccountKind kind,
            AccountStatus status,
            BigDecimal balance,
            Instant openedAt,
            Long customerId,
            String customerName,
            BigDecimal overdraftLimit,
            BigDecimal annualRate) {
    }

    // ---- money movement ----
    public record CashRequest(
            @NotNull @DecimalMin("0.01") @Digits(integer = 15, fraction = 2) BigDecimal amount,
            @Size(max = 200) String description) {
    }

    public record TransferRequest(
            @NotBlank String fromAccountId,
            @NotBlank String toAccountId,
            @NotNull @DecimalMin("0.01") @Digits(integer = 15, fraction = 2) BigDecimal amount,
            @Size(max = 200) String description) {
    }

    public record TransferReceipt(String fromAccountId, String toAccountId, BigDecimal amount, Instant executedAt) {
    }

    public record LedgerEntryResponse(
            Long id,
            String accountId,
            EntryType type,
            BigDecimal amount,
            BigDecimal balanceAfter,
            String description,
            Instant postedAt) {
    }

    public record StatementPage(
            String accountId,
            BigDecimal balance,
            int page,
            int size,
            int totalPages,
            long totalEntries,
            List<LedgerEntryResponse> entries) {
    }

    // ---- dashboard ----
    public record DashboardSummary(
            long customers,
            long checkingAccounts,
            long savingsAccounts,
            BigDecimal checkingBalance,
            BigDecimal savingsBalance,
            BigDecimal totalBalance,
            List<LedgerEntryResponse> recentActivity) {
    }
}

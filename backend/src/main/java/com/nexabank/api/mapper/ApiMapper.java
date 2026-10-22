package com.nexabank.api.mapper;

import com.nexabank.api.domain.*;
import com.nexabank.api.dto.Dtos.*;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;

@Component
public class ApiMapper {

    public CustomerResponse toResponse(Customer c) {
        return new CustomerResponse(c.getId(), c.getFullName(), c.getEmail(), c.getAccounts().size(), c.getCreatedAt());
    }

    public AccountResponse toResponse(Account a) {
        BigDecimal overdraft = null;
        BigDecimal rate = null;
        if (a instanceof CheckingAccount chk) {
            overdraft = chk.getOverdraftLimit();
        } else if (a instanceof SavingsAccount sav) {
            rate = sav.getAnnualRate();
        }
        return new AccountResponse(
                a.getId(), a.kind(), a.getStatus(), a.getBalance(), a.getOpenedAt(),
                a.getOwner().getId(), a.getOwner().getFullName(), overdraft, rate);
    }

    public LedgerEntryResponse toResponse(LedgerEntry e) {
        return new LedgerEntryResponse(
                e.getId(), e.getAccount().getId(), e.getType(), e.getAmount(),
                e.getBalanceAfter(), e.getDescription(), e.getPostedAt());
    }
}

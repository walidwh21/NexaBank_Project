package com.nexabank.api.service;

import com.nexabank.api.domain.*;
import com.nexabank.api.dto.Dtos.AccountResponse;
import com.nexabank.api.dto.Dtos.OpenAccountRequest;
import com.nexabank.api.error.BusinessRuleException;
import com.nexabank.api.error.ResourceNotFoundException;
import com.nexabank.api.mapper.ApiMapper;
import com.nexabank.api.repository.AccountRepository;
import com.nexabank.api.repository.CustomerRepository;
import com.nexabank.api.repository.LedgerEntryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AccountService {

    private static final BigDecimal DEFAULT_SAVINGS_RATE = new BigDecimal("2.50");

    private final AccountRepository accounts;
    private final CustomerRepository customers;
    private final LedgerEntryRepository ledger;
    private final AccountNumberGenerator numbers;
    private final ApiMapper mapper;

    public List<AccountResponse> list(Long customerId) {
        List<Account> found = customerId == null ? accounts.findAllWithOwner() : accounts.findByOwner(customerId);
        return found.stream().map(mapper::toResponse).toList();
    }

    public AccountResponse get(String id) {
        return mapper.toResponse(load(id));
    }

    @Transactional
    public AccountResponse open(OpenAccountRequest request) {
        Customer owner = customers.findById(request.customerId())
                .orElseThrow(() -> new ResourceNotFoundException("Customer", request.customerId()));

        Account account = switch (request.kind()) {
            case CHECKING -> {
                CheckingAccount chk = new CheckingAccount();
                chk.setOverdraftLimit(orZero(request.overdraftLimit()));
                yield chk;
            }
            case SAVINGS -> {
                SavingsAccount sav = new SavingsAccount();
                sav.setAnnualRate(request.annualRate() != null ? request.annualRate() : DEFAULT_SAVINGS_RATE);
                yield sav;
            }
        };
        account.setId(numbers.next());
        account.setOwner(owner);
        account.setOpenedAt(Instant.now());

        if (request.initialDeposit().signum() > 0) {
            account.deposit(request.initialDeposit());
        }
        Account saved = accounts.save(account);
        if (request.initialDeposit().signum() > 0) {
            ledger.save(LedgerEntry.of(saved, EntryType.DEPOSIT, request.initialDeposit(),
                    "Opening deposit", Instant.now()));
        }
        return mapper.toResponse(saved);
    }

    @Transactional
    public void delete(String id) {
        Account account = load(id);
        if (account.getBalance().signum() != 0) {
            throw new BusinessRuleException("Only accounts with a zero balance can be deleted");
        }
        accounts.delete(account);
    }

    private Account load(String id) {
        return accounts.findById(id.trim()).orElseThrow(() -> new ResourceNotFoundException("Account", id));
    }

    private static BigDecimal orZero(BigDecimal v) {
        return v == null ? BigDecimal.ZERO : v;
    }
}

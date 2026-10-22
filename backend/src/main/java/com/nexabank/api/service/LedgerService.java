package com.nexabank.api.service;

import com.nexabank.api.domain.Account;
import com.nexabank.api.domain.EntryType;
import com.nexabank.api.domain.LedgerEntry;
import com.nexabank.api.dto.Dtos.*;
import com.nexabank.api.error.BusinessRuleException;
import com.nexabank.api.error.ResourceNotFoundException;
import com.nexabank.api.mapper.ApiMapper;
import com.nexabank.api.repository.AccountRepository;
import com.nexabank.api.repository.LedgerEntryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

/** Posts money movements and exposes account statements. */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class LedgerService {

    private final AccountRepository accounts;
    private final LedgerEntryRepository ledger;
    private final ApiMapper mapper;

    @Transactional
    public LedgerEntryResponse deposit(String accountId, CashRequest request) {
        Account account = lock(accountId);
        account.deposit(request.amount());
        return post(account, EntryType.DEPOSIT, request, defaultText(request.description(), "Cash deposit"));
    }

    @Transactional
    public LedgerEntryResponse withdraw(String accountId, CashRequest request) {
        Account account = lock(accountId);
        account.withdraw(request.amount());
        return post(account, EntryType.WITHDRAWAL, request, defaultText(request.description(), "Cash withdrawal"));
    }

    @Transactional
    public TransferReceipt transfer(TransferRequest request) {
        String from = request.fromAccountId().trim();
        String to = request.toAccountId().trim();
        if (from.equals(to)) {
            throw new BusinessRuleException("Source and destination accounts must be different");
        }
        // Always lock in a stable order so two opposite transfers cannot deadlock.
        boolean fromFirst = from.compareTo(to) < 0;
        Account first = lock(fromFirst ? from : to);
        Account second = lock(fromFirst ? to : from);
        Account source = fromFirst ? first : second;
        Account target = fromFirst ? second : first;

        String note = defaultText(request.description(), "Transfer");
        source.withdraw(request.amount());
        target.deposit(request.amount());
        Instant now = Instant.now();
        ledger.save(LedgerEntry.of(source, EntryType.TRANSFER_OUT, request.amount(), note + " to " + to, now));
        ledger.save(LedgerEntry.of(target, EntryType.TRANSFER_IN, request.amount(), note + " from " + from, now));
        return new TransferReceipt(from, to, request.amount(), now);
    }

    public StatementPage statement(String accountId, int page, int size) {
        Account account = accounts.findById(accountId.trim())
                .orElseThrow(() -> new ResourceNotFoundException("Account", accountId));
        int safeSize = Math.min(Math.max(size, 1), 100);
        Page<LedgerEntry> result = ledger.findByAccountIdOrderByPostedAtDescIdDesc(
                account.getId(), PageRequest.of(Math.max(page, 0), safeSize));
        return new StatementPage(
                account.getId(), account.getBalance(), result.getNumber(), result.getSize(),
                result.getTotalPages(), result.getTotalElements(),
                result.getContent().stream().map(mapper::toResponse).toList());
    }

    private LedgerEntryResponse post(Account account, EntryType type, CashRequest request, String text) {
        LedgerEntry entry = ledger.save(LedgerEntry.of(account, type, request.amount(), text, Instant.now()));
        return mapper.toResponse(entry);
    }

    private Account lock(String id) {
        return accounts.lockById(id.trim()).orElseThrow(() -> new ResourceNotFoundException("Account", id));
    }

    private static String defaultText(String value, String fallback) {
        return (value == null || value.isBlank()) ? fallback : value.trim();
    }
}

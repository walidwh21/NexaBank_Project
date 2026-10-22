package com.nexabank.api.service;

import com.nexabank.api.dto.Dtos.DashboardSummary;
import com.nexabank.api.mapper.ApiMapper;
import com.nexabank.api.repository.AccountRepository;
import com.nexabank.api.repository.CustomerRepository;
import com.nexabank.api.repository.LedgerEntryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.Objects;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class DashboardService {

    private final CustomerRepository customers;
    private final AccountRepository accounts;
    private final LedgerEntryRepository ledger;
    private final ApiMapper mapper;

    public DashboardSummary summary() {
        BigDecimal checking = Objects.requireNonNullElse(accounts.sumChecking(), BigDecimal.ZERO);
        BigDecimal savings = Objects.requireNonNullElse(accounts.sumSavings(), BigDecimal.ZERO);
        return new DashboardSummary(
                customers.count(),
                accounts.countChecking(),
                accounts.countSavings(),
                checking,
                savings,
                checking.add(savings),
                ledger.findRecent(PageRequest.of(0, 8)).stream().map(mapper::toResponse).toList());
    }
}

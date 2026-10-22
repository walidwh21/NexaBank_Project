package com.nexabank.api.web;

import com.nexabank.api.dto.Dtos.*;
import com.nexabank.api.service.AccountService;
import com.nexabank.api.service.LedgerService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/accounts")
@RequiredArgsConstructor
public class AccountController {

    private final AccountService accounts;
    private final LedgerService ledger;

    @GetMapping
    public List<AccountResponse> list(@RequestParam(required = false) Long customerId) {
        return accounts.list(customerId);
    }

    @GetMapping("/{id}")
    public AccountResponse get(@PathVariable String id) {
        return accounts.get(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public AccountResponse open(@Valid @RequestBody OpenAccountRequest request) {
        return accounts.open(request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable String id) {
        accounts.delete(id);
    }

    @GetMapping("/{id}/statement")
    public StatementPage statement(@PathVariable String id,
                                   @RequestParam(defaultValue = "0") int page,
                                   @RequestParam(defaultValue = "8") int size) {
        return ledger.statement(id, page, size);
    }

    @PostMapping("/{id}/deposits")
    @ResponseStatus(HttpStatus.CREATED)
    public LedgerEntryResponse deposit(@PathVariable String id, @Valid @RequestBody CashRequest request) {
        return ledger.deposit(id, request);
    }

    @PostMapping("/{id}/withdrawals")
    @ResponseStatus(HttpStatus.CREATED)
    public LedgerEntryResponse withdraw(@PathVariable String id, @Valid @RequestBody CashRequest request) {
        return ledger.withdraw(id, request);
    }
}

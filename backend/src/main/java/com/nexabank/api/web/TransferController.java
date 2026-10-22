package com.nexabank.api.web;

import com.nexabank.api.dto.Dtos.TransferReceipt;
import com.nexabank.api.dto.Dtos.TransferRequest;
import com.nexabank.api.service.LedgerService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/transfers")
@RequiredArgsConstructor
public class TransferController {

    private final LedgerService ledger;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public TransferReceipt transfer(@Valid @RequestBody TransferRequest request) {
        return ledger.transfer(request);
    }
}

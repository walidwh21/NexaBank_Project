package com.nexabank.api.service;

import com.nexabank.api.repository.AccountRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.security.SecureRandom;

/** Produces human-friendly account numbers such as NX482913650274. */
@Component
@RequiredArgsConstructor
public class AccountNumberGenerator {

    private static final SecureRandom RANDOM = new SecureRandom();
    private final AccountRepository accounts;

    public String next() {
        String candidate;
        do {
            StringBuilder sb = new StringBuilder("NX");
            for (int i = 0; i < 12; i++) {
                sb.append(RANDOM.nextInt(10));
            }
            candidate = sb.toString();
        } while (accounts.existsById(candidate));
        return candidate;
    }
}

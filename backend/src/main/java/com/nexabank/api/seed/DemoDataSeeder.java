package com.nexabank.api.seed;

import com.nexabank.api.domain.*;
import com.nexabank.api.repository.AccountRepository;
import com.nexabank.api.repository.CustomerRepository;
import com.nexabank.api.repository.LedgerEntryRepository;
import com.nexabank.api.service.AccountNumberGenerator;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Random;

/** Fills an empty database with fictional customers and a believable transaction history. */
@Slf4j
@Component
@RequiredArgsConstructor
@ConditionalOnProperty(name = "nexabank.seed.enabled", havingValue = "true")
public class DemoDataSeeder implements CommandLineRunner {

    private static final String[][] PEOPLE = {
            {"Amelia Hart", "amelia.hart@example.com"},
            {"Liam Okafor", "liam.okafor@example.com"},
            {"Sofia Marin", "sofia.marin@example.com"},
            {"Noah Lindqvist", "noah.lindqvist@example.com"},
            {"Aiko Tanaka", "aiko.tanaka@example.com"},
            {"Mateo Silva", "mateo.silva@example.com"},
    };
    private static final String[] CREDITS = {"Salary", "Invoice payment", "Refund", "Interest adjustment", "Cash deposit"};
    private static final String[] DEBITS = {"Groceries", "Rent", "Utilities", "Online order", "Subscription", "Fuel"};

    private final CustomerRepository customers;
    private final AccountRepository accounts;
    private final LedgerEntryRepository ledger;
    private final AccountNumberGenerator numbers;

    @Override
    @Transactional
    public void run(String... args) {
        if (customers.count() > 0) {
            return;
        }
        Random rnd = new Random(2024);
        Instant now = Instant.now();
        List<Account> created = new ArrayList<>();

        for (String[] person : PEOPLE) {
            Customer customer = customers.save(new Customer(person[0], person[1]));

            CheckingAccount checking = new CheckingAccount();
            checking.setOverdraftLimit(new BigDecimal("1500.00"));
            created.add(openWithHistory(checking, customer, money(rnd, 1800, 6000), now, rnd));

            SavingsAccount savings = new SavingsAccount();
            savings.setAnnualRate(new BigDecimal("3.10"));
            created.add(openWithHistory(savings, customer, money(rnd, 8000, 40000), now, rnd));
        }
        log.info("Seeded {} customers and {} accounts", PEOPLE.length, created.size());
    }

    private Account openWithHistory(Account account, Customer owner, BigDecimal opening, Instant now, Random rnd) {
        account.setId(numbers.next());
        account.setOwner(owner);
        account.setOpenedAt(now.minus(Duration.ofDays(60)));
        account.deposit(opening);
        accounts.save(account);
        ledger.save(LedgerEntry.of(account, EntryType.DEPOSIT, opening, "Opening deposit", account.getOpenedAt()));

        for (int i = 0; i < 9; i++) {
            Instant when = now.minus(Duration.ofDays(55 - i * 6L)).minus(Duration.ofMinutes(rnd.nextInt(600)));
            boolean credit = rnd.nextInt(100) < 45;
            BigDecimal amount = money(rnd, 40, 900);
            if (credit) {
                account.deposit(amount);
                ledger.save(LedgerEntry.of(account, EntryType.DEPOSIT, amount, CREDITS[rnd.nextInt(CREDITS.length)], when));
            } else if (account.spendable().compareTo(amount) >= 0) {
                account.withdraw(amount);
                ledger.save(LedgerEntry.of(account, EntryType.WITHDRAWAL, amount, DEBITS[rnd.nextInt(DEBITS.length)], when));
            }
        }
        return accounts.save(account);
    }

    private static BigDecimal money(Random rnd, int min, int max) {
        double v = min + rnd.nextDouble() * (max - min);
        return BigDecimal.valueOf(v).setScale(2, RoundingMode.HALF_UP);
    }
}

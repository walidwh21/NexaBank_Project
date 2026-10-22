package com.nexabank.api.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.Instant;

/** One immutable line in an account statement. */
@Entity
@Table(name = "ledger_entries")
@Getter
@Setter
@NoArgsConstructor
public class LedgerEntry {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "account_id")
    private Account account;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private EntryType type;

    @Column(nullable = false, precision = 19, scale = 2)
    private BigDecimal amount;

    /** Account balance immediately after this entry was posted. */
    @Column(nullable = false, precision = 19, scale = 2)
    private BigDecimal balanceAfter;

    @Column(length = 200)
    private String description;

    @Column(nullable = false)
    private Instant postedAt = Instant.now();

    public static LedgerEntry of(Account account, EntryType type, BigDecimal amount, String description, Instant postedAt) {
        LedgerEntry e = new LedgerEntry();
        e.account = account;
        e.type = type;
        e.amount = amount;
        e.balanceAfter = account.getBalance();
        e.description = description;
        e.postedAt = postedAt;
        return e;
    }
}

package com.nexabank.api.domain;

import com.nexabank.api.error.BusinessRuleException;
import com.nexabank.api.error.InsufficientFundsException;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

/**
 * Base class for every account. Money movement rules live here (not in the service layer)
 * so that no code path can bypass them.
 */
@Entity
@Table(name = "accounts")
@Inheritance(strategy = InheritanceType.SINGLE_TABLE)
@DiscriminatorColumn(name = "product_code", length = 3)
@Getter
@Setter
@NoArgsConstructor
public abstract class Account {

    @Id
    @Column(length = 16)
    private String id;

    @Column(nullable = false, precision = 19, scale = 2)
    private BigDecimal balance = BigDecimal.ZERO;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 12)
    private AccountStatus status = AccountStatus.ACTIVE;

    @Column(nullable = false, updatable = false)
    private Instant openedAt = Instant.now();

    /** Null for a brand-new instance, which lets Spring Data persist() it instead of merge()-ing. */
    @Version
    private Long version;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "owner_id")
    private Customer owner;

    @OneToMany(mappedBy = "account", cascade = CascadeType.REMOVE)
    private List<LedgerEntry> entries = new ArrayList<>();

    public abstract AccountKind kind();

    /** Amount that can be withdrawn right now (balance plus any credit line). */
    public abstract BigDecimal spendable();

    public void deposit(BigDecimal amount) {
        requireActive();
        balance = balance.add(amount);
    }

    public void withdraw(BigDecimal amount) {
        requireActive();
        BigDecimal available = spendable();
        if (available.compareTo(amount) < 0) {
            throw new InsufficientFundsException(id, amount, available);
        }
        balance = balance.subtract(amount);
    }

    private void requireActive() {
        if (status != AccountStatus.ACTIVE) {
            throw new BusinessRuleException("Account " + id + " is " + status + " and cannot be used");
        }
    }
}

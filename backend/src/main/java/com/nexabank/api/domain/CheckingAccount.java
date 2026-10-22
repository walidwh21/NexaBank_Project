package com.nexabank.api.domain;

import jakarta.persistence.Column;
import jakarta.persistence.DiscriminatorValue;
import jakarta.persistence.Entity;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;

@Entity
@DiscriminatorValue("CHK")
@Getter
@Setter
@NoArgsConstructor
public class CheckingAccount extends Account {

    @Column(precision = 19, scale = 2)
    private BigDecimal overdraftLimit = BigDecimal.ZERO;

    @Override
    public AccountKind kind() {
        return AccountKind.CHECKING;
    }

    @Override
    public BigDecimal spendable() {
        return getBalance().add(overdraftLimit == null ? BigDecimal.ZERO : overdraftLimit);
    }
}

package com.nexabank.api.domain;

import jakarta.persistence.Column;
import jakarta.persistence.DiscriminatorValue;
import jakarta.persistence.Entity;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;

@Entity
@DiscriminatorValue("SAV")
@Getter
@Setter
@NoArgsConstructor
public class SavingsAccount extends Account {

    /** Annual percentage rate, e.g. 2.50 means 2.5 %. */
    @Column(precision = 5, scale = 2)
    private BigDecimal annualRate = new BigDecimal("2.50");

    @Override
    public AccountKind kind() {
        return AccountKind.SAVINGS;
    }

    @Override
    public BigDecimal spendable() {
        return getBalance();
    }
}

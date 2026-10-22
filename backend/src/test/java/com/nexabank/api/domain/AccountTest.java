package com.nexabank.api.domain;

import com.nexabank.api.error.BusinessRuleException;
import com.nexabank.api.error.InsufficientFundsException;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.*;

class AccountTest {

    private static CheckingAccount checking(String balance, String overdraft) {
        CheckingAccount a = new CheckingAccount();
        a.setId("NX000000000001");
        a.setBalance(new BigDecimal(balance));
        a.setOverdraftLimit(new BigDecimal(overdraft));
        return a;
    }

    @Test
    void checkingAccountMayUseItsOverdraft() {
        CheckingAccount a = checking("100.00", "50.00");
        a.withdraw(new BigDecimal("140.00"));
        assertEquals(new BigDecimal("-40.00"), a.getBalance());
    }

    @Test
    void checkingAccountCannotExceedOverdraft() {
        CheckingAccount a = checking("100.00", "50.00");
        assertThrows(InsufficientFundsException.class, () -> a.withdraw(new BigDecimal("150.01")));
        assertEquals(new BigDecimal("100.00"), a.getBalance());
    }

    @Test
    void savingsAccountCannotGoNegative() {
        SavingsAccount s = new SavingsAccount();
        s.setId("NX000000000002");
        s.setBalance(new BigDecimal("20.00"));
        assertThrows(InsufficientFundsException.class, () -> s.withdraw(new BigDecimal("20.01")));
    }

    @Test
    void suspendedAccountRejectsMovements() {
        CheckingAccount a = checking("100.00", "0.00");
        a.setStatus(AccountStatus.SUSPENDED);
        assertThrows(BusinessRuleException.class, () -> a.deposit(BigDecimal.ONE));
        assertThrows(BusinessRuleException.class, () -> a.withdraw(BigDecimal.ONE));
    }
}

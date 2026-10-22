package com.nexabank.api.repository;

import com.nexabank.api.domain.Account;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

public interface AccountRepository extends JpaRepository<Account, String> {

    @Query("select a from Account a join fetch a.owner order by a.openedAt desc")
    List<Account> findAllWithOwner();

    @Query("select a from Account a join fetch a.owner where a.owner.id = :customerId order by a.openedAt desc")
    List<Account> findByOwner(@Param("customerId") Long customerId);

    /** Row-level write lock, used while moving money so concurrent requests cannot overdraw. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select a from Account a where a.id = :id")
    Optional<Account> lockById(@Param("id") String id);

    long countByOwnerId(Long ownerId);

    @Query("select count(a) from CheckingAccount a")
    long countChecking();

    @Query("select count(a) from SavingsAccount a")
    long countSavings();

    /** Returns null when there are no checking accounts. */
    @Query("select sum(a.balance) from CheckingAccount a")
    BigDecimal sumChecking();

    @Query("select sum(a.balance) from SavingsAccount a")
    BigDecimal sumSavings();
}

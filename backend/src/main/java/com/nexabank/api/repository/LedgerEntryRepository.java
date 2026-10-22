package com.nexabank.api.repository;

import com.nexabank.api.domain.LedgerEntry;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface LedgerEntryRepository extends JpaRepository<LedgerEntry, Long> {

    Page<LedgerEntry> findByAccountIdOrderByPostedAtDescIdDesc(String accountId, Pageable pageable);

    @Query("select e from LedgerEntry e join fetch e.account order by e.postedAt desc, e.id desc")
    List<LedgerEntry> findRecent(Pageable pageable);
}

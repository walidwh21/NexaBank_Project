package com.nexabank.api.repository;

import com.nexabank.api.domain.Customer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface CustomerRepository extends JpaRepository<Customer, Long> {

    boolean existsByEmailIgnoreCase(String email);

    boolean existsByEmailIgnoreCaseAndIdNot(String email, Long id);

    @Query("""
            select c from Customer c
            where lower(c.fullName) like lower(concat('%', :q, '%'))
               or lower(c.email) like lower(concat('%', :q, '%'))
            order by c.fullName
            """)
    List<Customer> search(@Param("q") String query);
}

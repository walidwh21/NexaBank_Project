package com.nexabank.api.service;

import com.nexabank.api.domain.Customer;
import com.nexabank.api.dto.Dtos.CustomerRequest;
import com.nexabank.api.dto.Dtos.CustomerResponse;
import com.nexabank.api.error.BusinessRuleException;
import com.nexabank.api.error.ResourceNotFoundException;
import com.nexabank.api.mapper.ApiMapper;
import com.nexabank.api.repository.AccountRepository;
import com.nexabank.api.repository.CustomerRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CustomerService {

    private final CustomerRepository customers;
    private final AccountRepository accounts;
    private final ApiMapper mapper;

    public List<CustomerResponse> search(String query) {
        List<Customer> found = (query == null || query.isBlank())
                ? customers.findAll(org.springframework.data.domain.Sort.by("fullName"))
                : customers.search(query.trim());
        return found.stream().map(mapper::toResponse).toList();
    }

    public CustomerResponse get(Long id) {
        return mapper.toResponse(load(id));
    }

    @Transactional
    public CustomerResponse create(CustomerRequest request) {
        if (customers.existsByEmailIgnoreCase(request.email())) {
            throw new BusinessRuleException("A customer with e-mail " + request.email() + " already exists");
        }
        Customer saved = customers.save(new Customer(request.fullName().trim(), request.email().trim()));
        return mapper.toResponse(saved);
    }

    @Transactional
    public CustomerResponse update(Long id, CustomerRequest request) {
        Customer customer = load(id);
        if (customers.existsByEmailIgnoreCaseAndIdNot(request.email(), id)) {
            throw new BusinessRuleException("E-mail " + request.email() + " is already used by another customer");
        }
        customer.setFullName(request.fullName().trim());
        customer.setEmail(request.email().trim());
        return mapper.toResponse(customer);
    }

    @Transactional
    public void delete(Long id) {
        Customer customer = load(id);
        long owned = accounts.countByOwnerId(id);
        if (owned > 0) {
            throw new BusinessRuleException(
                    "Customer still owns " + owned + " account(s); close or delete them first");
        }
        customers.delete(customer);
    }

    private Customer load(Long id) {
        return customers.findById(id).orElseThrow(() -> new ResourceNotFoundException("Customer", id));
    }
}

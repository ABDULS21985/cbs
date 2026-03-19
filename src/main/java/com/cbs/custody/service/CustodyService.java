package com.cbs.custody.service;

import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.custody.entity.CustodyAccount;
import com.cbs.custody.repository.CustodyAccountRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class CustodyService {

    private final CustodyAccountRepository custodyRepository;

    @Transactional
    public CustodyAccount open(CustodyAccount account) {
        account.setAccountCode("CUS-" + UUID.randomUUID().toString().substring(0, 10).toUpperCase());
        account.setOpenedAt(Instant.now());
        account.setStatus("ACTIVE");
        CustodyAccount saved = custodyRepository.save(account);
        log.info("Custody account opened: {}", saved.getAccountCode());
        return saved;
    }

    public CustodyAccount getByCode(String code) {
        return custodyRepository.findByAccountCode(code)
                .orElseThrow(() -> new ResourceNotFoundException("CustodyAccount", "accountCode", code));
    }

    public List<CustodyAccount> getByCustomer(Long customerId) {
        return custodyRepository.findByCustomerIdAndStatusOrderByAccountNameAsc(customerId, "ACTIVE");
    }

    public List<CustodyAccount> getAll() {
        return custodyRepository.findAll();
    }

    public List<CustodyAccount> getAllAccounts() {
        return custodyAccountRepository.findAll();
    }
}
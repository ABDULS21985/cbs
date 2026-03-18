package com.cbs.trustservices.service;

import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.trustservices.entity.TrustAccount;
import com.cbs.trustservices.repository.TrustAccountRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class TrustService {

    private final TrustAccountRepository trustRepository;

    @Transactional
    public TrustAccount create(TrustAccount trust) {
        trust.setTrustCode("TRS-" + UUID.randomUUID().toString().substring(0, 10).toUpperCase());
        trust.setStatus("PENDING");
        TrustAccount saved = trustRepository.save(trust);
        log.info("Trust created: {}", saved.getTrustCode());
        return saved;
    }

    @Transactional
    public TrustAccount recordDistribution(String trustCode, BigDecimal amount) {
        TrustAccount trust = getByCode(trustCode);
        if (trust.getCorpusValue().compareTo(amount) < 0) {
            throw new BusinessException("Distribution amount exceeds corpus value");
        }
        trust.setDistributionsYtd(trust.getDistributionsYtd().add(amount));
        trust.setCorpusValue(trust.getCorpusValue().subtract(amount));
        log.info("Trust distribution: {} amount={}", trustCode, amount);
        return trustRepository.save(trust);
    }

    public TrustAccount getByCode(String code) {
        return trustRepository.findByTrustCode(code)
                .orElseThrow(() -> new ResourceNotFoundException("TrustAccount", "trustCode", code));
    }

    public List<TrustAccount> getByGrantor(Long grantorCustomerId) {
        return trustRepository.findByGrantorCustomerIdAndStatusOrderByTrustNameAsc(grantorCustomerId, "ACTIVE");
    }

    public List<TrustAccount> getByType(String trustType) {
        return trustRepository.findByTrustTypeAndStatusOrderByTrustNameAsc(trustType, "ACTIVE");
    }
}

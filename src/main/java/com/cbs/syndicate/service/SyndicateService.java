package com.cbs.syndicate.service;

import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.syndicate.entity.SyndicateArrangement;
import com.cbs.syndicate.repository.SyndicateArrangementRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class SyndicateService {

    private final SyndicateArrangementRepository syndicateRepository;

    @Transactional
    public SyndicateArrangement create(SyndicateArrangement syndicate) {
        syndicate.setSyndicateCode("SYN-" + UUID.randomUUID().toString().substring(0, 10).toUpperCase());
        if (syndicate.getTotalFacilityAmount().signum() > 0) {
            syndicate.setOurSharePct(syndicate.getOurCommitment()
                    .divide(syndicate.getTotalFacilityAmount(), 4, RoundingMode.HALF_UP)
                    .multiply(new BigDecimal("100")));
        }
        log.info("Syndicate created: code={}, type={}, total={}, our_share={}%",
                syndicate.getSyndicateCode(), syndicate.getSyndicateType(),
                syndicate.getTotalFacilityAmount(), syndicate.getOurSharePct());
        return syndicateRepository.save(syndicate);
    }

    @Transactional
    public SyndicateArrangement activate(String code) {
        SyndicateArrangement s = getByCode(code);
        s.setStatus("ACTIVE");
        s.setSigningDate(LocalDate.now());
        return syndicateRepository.save(s);
    }

    public SyndicateArrangement getByCode(String code) {
        return syndicateRepository.findBySyndicateCode(code)
                .orElseThrow(() -> new ResourceNotFoundException("SyndicateArrangement", "syndicateCode", code));
    }

    public List<SyndicateArrangement> getByType(String type) {
        return syndicateRepository.findBySyndicateTypeAndStatusOrderBySyndicateNameAsc(type, "ACTIVE");
    }

    public List<SyndicateArrangement> getActive() {
        return syndicateRepository.findByStatusOrderBySyndicateNameAsc("ACTIVE");
    }
}

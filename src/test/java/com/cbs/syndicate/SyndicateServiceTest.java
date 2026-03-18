package com.cbs.syndicate;

import com.cbs.syndicate.entity.SyndicateArrangement;
import com.cbs.syndicate.repository.SyndicateArrangementRepository;
import com.cbs.syndicate.service.SyndicateService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SyndicateServiceTest {

    @Mock private SyndicateArrangementRepository syndicateRepository;
    @InjectMocks private SyndicateService service;

    @Test @DisplayName("Our share % auto-calculated from commitment / facility")
    void shareCalc() {
        when(syndicateRepository.save(any())).thenAnswer(inv -> {
            SyndicateArrangement s = inv.getArgument(0);
            s.setId(1L);
            return s;
        });
        SyndicateArrangement syn = SyndicateArrangement.builder()
                .syndicateName("Infrastructure Fund 2026")
                .syndicateType("LOAN_SYNDICATION")
                .leadArranger("Standard Chartered")
                .totalFacilityAmount(new BigDecimal("100000000"))
                .ourCommitment(new BigDecimal("25000000")).build();
        SyndicateArrangement result = service.create(syn);
        assertThat(result.getOurSharePct()).isEqualByComparingTo(new BigDecimal("25.0000"));
        assertThat(result.getSyndicateCode()).startsWith("SYN-");
    }

    @Test @DisplayName("Activation sets signing date and ACTIVE status")
    void activate() {
        SyndicateArrangement syn = new SyndicateArrangement();
        syn.setId(1L);
        syn.setSyndicateCode("SYN-ACT");
        syn.setStatus("COMMITTED");
        when(syndicateRepository.findBySyndicateCode("SYN-ACT")).thenReturn(Optional.of(syn));
        when(syndicateRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        SyndicateArrangement result = service.activate("SYN-ACT");
        assertThat(result.getStatus()).isEqualTo("ACTIVE");
        assertThat(result.getSigningDate()).isNotNull();
    }
}

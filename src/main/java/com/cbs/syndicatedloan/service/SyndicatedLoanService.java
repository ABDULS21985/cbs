package com.cbs.syndicatedloan.service;

import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.syndicatedloan.entity.SyndicateDrawdown;
import com.cbs.syndicatedloan.entity.SyndicateParticipant;
import com.cbs.syndicatedloan.entity.SyndicatedLoanFacility;
import com.cbs.syndicatedloan.repository.SyndicateDrawdownRepository;
import com.cbs.syndicatedloan.repository.SyndicateParticipantRepository;
import com.cbs.syndicatedloan.repository.SyndicatedLoanFacilityRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class SyndicatedLoanService {

    private final SyndicatedLoanFacilityRepository facilityRepository;
    private final SyndicateParticipantRepository participantRepository;
    private final SyndicateDrawdownRepository drawdownRepository;

    @Transactional
    public SyndicatedLoanFacility createFacility(SyndicatedLoanFacility facility) {
        facility.setFacilityCode("SLF-" + UUID.randomUUID().toString().substring(0, 10).toUpperCase());
        facility.setUndrawnAmount(facility.getTotalFacilityAmount());
        return facilityRepository.save(facility);
    }

    @Transactional
    public SyndicateParticipant addParticipant(String facilityCode, SyndicateParticipant participant) {
        SyndicatedLoanFacility facility = getByCode(facilityCode);
        participant.setFacilityId(facility.getId());
        return participantRepository.save(participant);
    }

    @Transactional
    public SyndicateDrawdown requestDrawdown(String facilityCode, SyndicateDrawdown drawdown) {
        SyndicatedLoanFacility facility = getByCode(facilityCode);
        drawdown.setDrawdownRef("SDD-" + UUID.randomUUID().toString().substring(0, 10).toUpperCase());
        drawdown.setFacilityId(facility.getId());
        drawdown.setStatus("REQUESTED");

        // Calculate our share of the drawdown
        if (facility.getOurSharePct() != null && facility.getOurSharePct().compareTo(BigDecimal.ZERO) > 0) {
            BigDecimal ourDrawdown = drawdown.getAmount()
                    .multiply(facility.getOurSharePct())
                    .divide(new BigDecimal("100"), 4, RoundingMode.HALF_UP);
            log.info("Our share of drawdown: {} ({}%)", ourDrawdown, facility.getOurSharePct());
        }

        return drawdownRepository.save(drawdown);
    }

    @Transactional
    public SyndicateDrawdown fundDrawdown(String drawdownRef) {
        SyndicateDrawdown drawdown = drawdownRepository.findByDrawdownRef(drawdownRef)
                .orElseThrow(() -> new ResourceNotFoundException("SyndicateDrawdown", "drawdownRef", drawdownRef));
        if (!"APPROVED".equals(drawdown.getStatus())) {
            throw new BusinessException("Drawdown " + drawdownRef + " must be APPROVED to fund; current status: " + drawdown.getStatus());
        }
        drawdown.setStatus("FUNDED");

        // Update facility drawn/undrawn amounts
        SyndicatedLoanFacility facility = facilityRepository.findById(drawdown.getFacilityId())
                .orElseThrow(() -> new ResourceNotFoundException("SyndicatedLoanFacility", "id", drawdown.getFacilityId()));
        BigDecimal newDrawn = facility.getDrawnAmount().add(drawdown.getAmount());
        facility.setDrawnAmount(newDrawn);
        facility.setUndrawnAmount(facility.getTotalFacilityAmount().subtract(newDrawn));
        facilityRepository.save(facility);

        return drawdownRepository.save(drawdown);
    }

    public List<SyndicatedLoanFacility> getByRole(String ourRole) {
        return facilityRepository.findByOurRoleOrderByFacilityNameAsc(ourRole);
    }

    public List<SyndicateParticipant> getParticipants(String facilityCode) {
        SyndicatedLoanFacility facility = getByCode(facilityCode);
        return participantRepository.findByFacilityIdOrderBySharePctDesc(facility.getId());
    }

    public List<SyndicateDrawdown> getDrawdowns(String facilityCode) {
        SyndicatedLoanFacility facility = getByCode(facilityCode);
        return drawdownRepository.findByFacilityIdOrderByValueDateDesc(facility.getId());
    }

    private SyndicatedLoanFacility getByCode(String code) {
        return facilityRepository.findByFacilityCode(code)
                .orElseThrow(() -> new ResourceNotFoundException("SyndicatedLoanFacility", "facilityCode", code));
    }
}

package com.cbs.syndicatedloan.service;

import com.cbs.common.audit.CurrentActorProvider;
import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.gl.entity.JournalEntry;
import com.cbs.gl.service.GeneralLedgerService;
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
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class SyndicatedLoanService {

    private static final String GL_SYNDICATED_LOAN_RECEIVABLE = "1450010";
    private static final String GL_NOSTRO_SETTLEMENT = "1100020";

    private final SyndicatedLoanFacilityRepository facilityRepository;
    private final SyndicateParticipantRepository participantRepository;
    private final SyndicateDrawdownRepository drawdownRepository;
    private final GeneralLedgerService generalLedgerService;
    private final CurrentActorProvider currentActorProvider;

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

        // Validate drawdown amount does not exceed undrawn facility amount
        SyndicatedLoanFacility facility = facilityRepository.findById(drawdown.getFacilityId())
                .orElseThrow(() -> new ResourceNotFoundException("SyndicatedLoanFacility", "id", drawdown.getFacilityId()));
        if (drawdown.getAmount().compareTo(facility.getUndrawnAmount()) > 0) {
            throw new BusinessException(
                    String.format("Drawdown amount %s exceeds undrawn facility amount %s",
                            drawdown.getAmount(), facility.getUndrawnAmount()),
                    "DRAWDOWN_EXCEEDS_UNDRAWN");
        }

        drawdown.setStatus("FUNDED");

        // Update facility drawn/undrawn amounts
        BigDecimal newDrawn = facility.getDrawnAmount().add(drawdown.getAmount());
        facility.setDrawnAmount(newDrawn);
        facility.setUndrawnAmount(facility.getTotalFacilityAmount().subtract(newDrawn));
        facilityRepository.save(facility);

        // GL posting: Debit Syndicated Loan Receivable, Credit Nostro/Settlement Account
        String narration = String.format("Syndicated loan drawdown funding - %s facility %s",
                drawdownRef, facility.getFacilityCode());
        List<GeneralLedgerService.JournalLineRequest> journalLines = List.of(
                new GeneralLedgerService.JournalLineRequest(
                        GL_SYNDICATED_LOAN_RECEIVABLE,
                        drawdown.getAmount(), BigDecimal.ZERO,
                        drawdown.getCurrency(), BigDecimal.ONE,
                        narration, null, null, null, null),
                new GeneralLedgerService.JournalLineRequest(
                        GL_NOSTRO_SETTLEMENT,
                        BigDecimal.ZERO, drawdown.getAmount(),
                        drawdown.getCurrency(), BigDecimal.ONE,
                        narration, null, null, null, null)
        );

        JournalEntry journal = generalLedgerService.postJournal(
                "SYNDICATED_LOAN",
                narration,
                "SYNDICATED_LOAN",
                drawdownRef,
                drawdown.getValueDate(),
                currentActorProvider.getCurrentActor(),
                journalLines
        );

        SyndicateDrawdown saved = drawdownRepository.save(drawdown);
        log.info("Drawdown funded: ref={}, amount={}, currency={}, facility={}, journalId={}, actor={}",
                drawdownRef, drawdown.getAmount(), drawdown.getCurrency(),
                facility.getFacilityCode(), journal.getId(), currentActorProvider.getCurrentActor());
        return saved;
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

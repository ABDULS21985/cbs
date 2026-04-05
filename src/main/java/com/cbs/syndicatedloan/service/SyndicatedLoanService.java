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
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class SyndicatedLoanService {

    private static final String GL_SYNDICATED_LOAN_RECEIVABLE = "1450010";
    private static final String GL_NOSTRO_SETTLEMENT = "1100020";
    private static final String GL_INTEREST_RECEIVABLE = "1450020";
    private static final String GL_INTEREST_INCOME = "4100010";

    private final SyndicatedLoanFacilityRepository facilityRepository;
    private final SyndicateParticipantRepository participantRepository;
    private final SyndicateDrawdownRepository drawdownRepository;
    private final GeneralLedgerService generalLedgerService;
    private final CurrentActorProvider currentActorProvider;

    @Transactional
    public SyndicatedLoanFacility createFacility(SyndicatedLoanFacility facility) {
        if (!StringUtils.hasText(facility.getFacilityName())) {
            throw new BusinessException("Facility name is required", "MISSING_FACILITY_NAME");
        }
        if (facility.getTotalFacilityAmount() == null || facility.getTotalFacilityAmount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new BusinessException("Total facility amount must be positive", "INVALID_FACILITY_AMOUNT");
        }
        facility.setFacilityCode("SLF-" + UUID.randomUUID().toString().substring(0, 10).toUpperCase());
        facility.setUndrawnAmount(facility.getTotalFacilityAmount());
        facility.setDrawnAmount(BigDecimal.ZERO);
        facility.setStatus("DRAFT");
        SyndicatedLoanFacility saved = facilityRepository.save(facility);
        log.info("AUDIT: Syndicated loan facility created: code={}, amount={}, actor={}",
                saved.getFacilityCode(), saved.getTotalFacilityAmount(), currentActorProvider.getCurrentActor());
        return saved;
    }

    @Transactional
    public SyndicateParticipant addParticipant(String facilityCode, SyndicateParticipant participant) {
        SyndicatedLoanFacility facility = getByCode(facilityCode);
        if (!StringUtils.hasText(participant.getParticipantName())) {
            throw new BusinessException("Participant name is required", "MISSING_PARTICIPANT_NAME");
        }
        if (participant.getSharePct() == null || participant.getSharePct().compareTo(BigDecimal.ZERO) <= 0) {
            throw new BusinessException("Share percentage must be positive", "INVALID_SHARE_PCT");
        }
        participant.setFacilityId(facility.getId());
        SyndicateParticipant saved = participantRepository.save(participant);
        log.info("AUDIT: Participant added: facility={}, participant={}, share={}%, actor={}",
                facilityCode, participant.getParticipantName(), participant.getSharePct(),
                currentActorProvider.getCurrentActor());
        return saved;
    }

    @Transactional
    public SyndicateDrawdown requestDrawdown(String facilityCode, SyndicateDrawdown drawdown) {
        SyndicatedLoanFacility facility = getByCode(facilityCode);

        // Validate drawdown amount against undrawn balance
        if (drawdown.getAmount() == null || drawdown.getAmount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new BusinessException("Drawdown amount must be positive", "INVALID_DRAWDOWN_AMOUNT");
        }
        if (drawdown.getAmount().compareTo(facility.getUndrawnAmount()) > 0) {
            throw new BusinessException(
                    String.format("Drawdown amount %s exceeds undrawn facility amount %s",
                            drawdown.getAmount(), facility.getUndrawnAmount()),
                    "DRAWDOWN_EXCEEDS_UNDRAWN");
        }

        drawdown.setDrawdownRef("SDD-" + UUID.randomUUID().toString().substring(0, 10).toUpperCase());
        drawdown.setFacilityId(facility.getId());
        drawdown.setStatus("REQUESTED");

        // Calculate our share of the drawdown
        if (facility.getOurSharePct() != null && facility.getOurSharePct().compareTo(BigDecimal.ZERO) > 0) {
            BigDecimal ourDrawdown = drawdown.getAmount()
                    .multiply(facility.getOurSharePct())
                    .divide(new BigDecimal("100"), 4, RoundingMode.HALF_UP);
            // Our share amount tracked in log for reporting
            log.info("Our share of drawdown: {} ({}%)", ourDrawdown, facility.getOurSharePct());
        }

        SyndicateDrawdown saved = drawdownRepository.save(drawdown);
        log.info("AUDIT: Drawdown requested: ref={}, amount={}, facility={}, actor={}",
                saved.getDrawdownRef(), drawdown.getAmount(), facilityCode,
                currentActorProvider.getCurrentActor());
        return saved;
    }

    @Transactional
    public SyndicateDrawdown fundDrawdown(String drawdownRef) {
        SyndicateDrawdown drawdown = drawdownRepository.findByDrawdownRef(drawdownRef)
                .orElseThrow(() -> new ResourceNotFoundException("SyndicateDrawdown", "drawdownRef", drawdownRef));
        if (!"APPROVED".equals(drawdown.getStatus())) {
            throw new BusinessException("Drawdown " + drawdownRef + " must be APPROVED to fund; current status: " + drawdown.getStatus());
        }

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
        log.info("AUDIT: Drawdown funded: ref={}, amount={}, currency={}, facility={}, journalId={}, actor={}",
                drawdownRef, drawdown.getAmount(), drawdown.getCurrency(),
                facility.getFacilityCode(), journal.getId(), currentActorProvider.getCurrentActor());
        return saved;
    }

    @Transactional
    public SyndicateDrawdown recordRepayment(String drawdownRef, BigDecimal repaymentAmount) {
        SyndicateDrawdown drawdown = drawdownRepository.findByDrawdownRef(drawdownRef)
                .orElseThrow(() -> new ResourceNotFoundException("SyndicateDrawdown", "drawdownRef", drawdownRef));
        if (!"FUNDED".equals(drawdown.getStatus())) {
            throw new BusinessException("Only FUNDED drawdowns can be repaid; current status: " + drawdown.getStatus(),
                    "INVALID_DRAWDOWN_STATUS");
        }
        if (repaymentAmount == null || repaymentAmount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new BusinessException("Repayment amount must be positive", "INVALID_REPAYMENT_AMOUNT");
        }
        if (repaymentAmount.compareTo(drawdown.getAmount()) > 0) {
            throw new BusinessException("Repayment amount exceeds outstanding drawdown amount", "REPAYMENT_EXCEEDS_OUTSTANDING");
        }

        // Update facility
        SyndicatedLoanFacility facility = facilityRepository.findById(drawdown.getFacilityId())
                .orElseThrow(() -> new ResourceNotFoundException("SyndicatedLoanFacility", "id", drawdown.getFacilityId()));
        facility.setDrawnAmount(facility.getDrawnAmount().subtract(repaymentAmount));
        facility.setUndrawnAmount(facility.getTotalFacilityAmount().subtract(facility.getDrawnAmount()));
        facilityRepository.save(facility);

        // Update drawdown
        BigDecimal remaining = drawdown.getAmount().subtract(repaymentAmount);
        drawdown.setAmount(remaining);
        if (remaining.compareTo(BigDecimal.ZERO) == 0) {
            drawdown.setStatus("REPAID");
        }

        // GL posting: reverse the receivable
        String narration = String.format("Syndicated loan repayment - %s", drawdownRef);
        List<GeneralLedgerService.JournalLineRequest> journalLines = List.of(
                new GeneralLedgerService.JournalLineRequest(
                        GL_NOSTRO_SETTLEMENT,
                        repaymentAmount, BigDecimal.ZERO,
                        drawdown.getCurrency(), BigDecimal.ONE,
                        narration, null, null, null, null),
                new GeneralLedgerService.JournalLineRequest(
                        GL_SYNDICATED_LOAN_RECEIVABLE,
                        BigDecimal.ZERO, repaymentAmount,
                        drawdown.getCurrency(), BigDecimal.ONE,
                        narration, null, null, null, null)
        );
        generalLedgerService.postJournal("SYNDICATED_LOAN_REPAYMENT", narration,
                "SYNDICATED_LOAN", drawdownRef + ":REPAY", LocalDate.now(),
                currentActorProvider.getCurrentActor(), journalLines);

        SyndicateDrawdown saved = drawdownRepository.save(drawdown);
        log.info("AUDIT: Repayment recorded: ref={}, repayment={}, remaining={}, actor={}",
                drawdownRef, repaymentAmount, remaining, currentActorProvider.getCurrentActor());
        return saved;
    }

    /**
     * Calculate interest accrual for a funded drawdown based on the facility rate and days elapsed.
     */
    @Transactional
    public BigDecimal calculateInterest(String drawdownRef) {
        SyndicateDrawdown drawdown = drawdownRepository.findByDrawdownRef(drawdownRef)
                .orElseThrow(() -> new ResourceNotFoundException("SyndicateDrawdown", "drawdownRef", drawdownRef));
        if (!"FUNDED".equals(drawdown.getStatus())) {
            throw new BusinessException("Interest can only be calculated on FUNDED drawdowns", "INVALID_DRAWDOWN_STATUS");
        }

        SyndicatedLoanFacility facility = facilityRepository.findById(drawdown.getFacilityId())
                .orElseThrow(() -> new ResourceNotFoundException("SyndicatedLoanFacility", "id", drawdown.getFacilityId()));

        BigDecimal rate = drawdown.getInterestRate() != null ? drawdown.getInterestRate() : BigDecimal.ZERO;
        LocalDate startDate = drawdown.getValueDate() != null ? drawdown.getValueDate() : LocalDate.now().minusDays(30);
        long daysSinceDrawdown = ChronoUnit.DAYS.between(startDate, LocalDate.now());

        // Simple interest: principal * rate/100 * days/365
        BigDecimal interest = drawdown.getAmount()
                .multiply(rate)
                .multiply(BigDecimal.valueOf(daysSinceDrawdown))
                .divide(BigDecimal.valueOf(36500), 4, RoundingMode.HALF_UP);

        // Our share of interest
        BigDecimal ourInterest = interest;
        if (facility.getOurSharePct() != null && facility.getOurSharePct().compareTo(BigDecimal.ZERO) > 0) {
            ourInterest = interest.multiply(facility.getOurSharePct())
                    .divide(new BigDecimal("100"), 4, RoundingMode.HALF_UP);
        }

        // GL posting for interest accrual
        if (ourInterest.compareTo(BigDecimal.ZERO) > 0) {
            String narration = String.format("Interest accrual - drawdown %s, %d days", drawdownRef, daysSinceDrawdown);
            List<GeneralLedgerService.JournalLineRequest> journalLines = List.of(
                    new GeneralLedgerService.JournalLineRequest(
                            GL_INTEREST_RECEIVABLE,
                            ourInterest, BigDecimal.ZERO,
                            drawdown.getCurrency(), BigDecimal.ONE,
                            narration, null, null, null, null),
                    new GeneralLedgerService.JournalLineRequest(
                            GL_INTEREST_INCOME,
                            BigDecimal.ZERO, ourInterest,
                            drawdown.getCurrency(), BigDecimal.ONE,
                            narration, null, null, null, null)
            );
            generalLedgerService.postJournal("SYNDICATED_LOAN_INTEREST", narration,
                    "SYNDICATED_LOAN", drawdownRef + ":INT", LocalDate.now(),
                    currentActorProvider.getCurrentActor(), journalLines);
        }

        log.info("AUDIT: Interest calculated: ref={}, principal={}, rate={}, days={}, interest={}, ourShare={}",
                drawdownRef, drawdown.getAmount(), rate, daysSinceDrawdown, interest, ourInterest);
        return ourInterest;
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

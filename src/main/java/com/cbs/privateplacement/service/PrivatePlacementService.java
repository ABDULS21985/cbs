package com.cbs.privateplacement.service;

import com.cbs.common.audit.CurrentActorProvider;
import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.privateplacement.entity.PlacementInvestor;
import com.cbs.privateplacement.entity.PrivatePlacement;
import com.cbs.privateplacement.repository.PlacementInvestorRepository;
import com.cbs.privateplacement.repository.PrivatePlacementRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class PrivatePlacementService {

    private static final Set<String> OPEN_STATUSES = Set.of("STRUCTURING", "MARKETING", "SUBSCRIPTION");

    private final PrivatePlacementRepository placementRepository;
    private final PlacementInvestorRepository investorRepository;
    private final CurrentActorProvider currentActorProvider;

    @Transactional
    public PrivatePlacement createPlacement(PrivatePlacement placement) {
        if (placement.getTargetAmount() == null || placement.getTargetAmount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new BusinessException("targetAmount must be positive", "INVALID_TARGET");
        }
        placement.setPlacementCode("PP-" + UUID.randomUUID().toString().substring(0, 10).toUpperCase());
        placement.setStatus("STRUCTURING");
        PrivatePlacement saved = placementRepository.save(placement);
        log.info("AUDIT: Private placement created by {}: code={}, issuer={}, target={}",
                currentActorProvider.getCurrentActor(), saved.getPlacementCode(), saved.getIssuerName(), saved.getTargetAmount());
        return saved;
    }

    @Transactional
    public PlacementInvestor addInvestor(String placementCode, PlacementInvestor investor) {
        PrivatePlacement placement = getByCode(placementCode);

        // Status check: placement must be open
        if (!OPEN_STATUSES.contains(placement.getStatus())) {
            throw new BusinessException("Cannot add investor to placement in status " + placement.getStatus() + "; must be STRUCTURING, MARKETING, or SUBSCRIPTION", "INVALID_STATE");
        }

        // Max investors check
        if (placement.getMaxInvestors() != null && placement.getCurrentInvestors() >= placement.getMaxInvestors()) {
            throw new BusinessException("Placement " + placementCode + " has reached maximum investors limit of " + placement.getMaxInvestors(), "MAX_INVESTORS_REACHED");
        }

        // Accredited investor verification for eligible placements
        if ("ACCREDITED_ONLY".equals(placement.getEligibilityType())
                && (investor.getAccreditationVerified() == null || !investor.getAccreditationVerified())) {
            throw new BusinessException("Placement requires accredited investors only", "NOT_ACCREDITED");
        }

        // Minimum subscription check
        if (placement.getMinimumSubscription() != null && investor.getCommitmentAmount() != null
                && investor.getCommitmentAmount().compareTo(placement.getMinimumSubscription()) < 0) {
            throw new BusinessException("Commitment amount " + investor.getCommitmentAmount() + " is below minimum subscription of " + placement.getMinimumSubscription(), "BELOW_MINIMUM");
        }

        investor.setPlacementId(placement.getId());
        investor.setStatus("COMMITTED");
        PlacementInvestor saved = investorRepository.save(investor);
        placement.setCurrentInvestors(placement.getCurrentInvestors() + 1);
        placementRepository.save(placement);
        log.info("AUDIT: Investor added by {}: placement={}, investor={}, commitment={}",
                currentActorProvider.getCurrentActor(), placementCode, saved.getId(), saved.getCommitmentAmount());
        return saved;
    }

    @Transactional
    public PlacementInvestor recordFunding(String placementCode, Long investorId) {
        return recordFunding(placementCode, investorId, null);
    }

    @Transactional
    public PlacementInvestor recordFunding(String placementCode, Long investorId, BigDecimal fundedAmount) {
        PrivatePlacement placement = getByCode(placementCode);
        PlacementInvestor investor = investorRepository.findById(investorId)
                .orElseThrow(() -> new ResourceNotFoundException("PlacementInvestor", "id", investorId));

        if ("FUNDED".equals(investor.getStatus())) {
            throw new BusinessException("Investor " + investorId + " is already fully funded", "ALREADY_FUNDED");
        }

        // Support partial funding
        BigDecimal amountToFund = fundedAmount != null ? fundedAmount : investor.getCommitmentAmount();
        if (amountToFund.compareTo(investor.getCommitmentAmount()) > 0) {
            throw new BusinessException("Funded amount cannot exceed commitment amount", "EXCEEDS_COMMITMENT");
        }

        investor.setPaidAmount(amountToFund);
        investor.setStatus(amountToFund.compareTo(investor.getCommitmentAmount()) >= 0 ? "FUNDED" : "PARTIALLY_FUNDED");
        investorRepository.save(investor);
        placement.setRaisedAmount(placement.getRaisedAmount().add(amountToFund));
        placementRepository.save(placement);
        log.info("AUDIT: Funding recorded by {}: placement={}, investor={}, amount={}, status={}",
                currentActorProvider.getCurrentActor(), placementCode, investorId, amountToFund, investor.getStatus());
        return investor;
    }

    @Transactional
    public PrivatePlacement closePlacement(String placementCode) {
        PrivatePlacement placement = getByCode(placementCode);
        if ("CLOSED".equals(placement.getStatus())) {
            throw new BusinessException("Placement " + placementCode + " is already closed", "ALREADY_CLOSED");
        }
        BigDecimal threshold = placement.getTargetAmount().multiply(new BigDecimal("0.8"));
        if (placement.getRaisedAmount().compareTo(threshold) < 0) {
            throw new BusinessException("Cannot close: raised amount " + placement.getRaisedAmount() + " is below 80% of target " + placement.getTargetAmount(), "INSUFFICIENT_FUNDING");
        }
        placement.setStatus("CLOSED");
        PrivatePlacement saved = placementRepository.save(placement);

        // Notify investors (log-based notification)
        List<PlacementInvestor> investors = investorRepository.findByPlacementIdOrderByCommitmentAmountDesc(placement.getId());
        log.info("AUDIT: Placement closed by {}: code={}, raised={}, investors notified={}",
                currentActorProvider.getCurrentActor(), placementCode, placement.getRaisedAmount(), investors.size());

        return saved;
    }

    public List<PrivatePlacement> getActivePlacements() {
        return placementRepository.findByStatusInOrderByClosingDateAsc(List.of("STRUCTURING", "MARKETING", "SUBSCRIPTION"));
    }

    public List<PlacementInvestor> getInvestorBook(String placementCode) {
        PrivatePlacement placement = getByCode(placementCode);
        return investorRepository.findByPlacementIdOrderByCommitmentAmountDesc(placement.getId());
    }

    public PrivatePlacement getByCode(String code) {
        return placementRepository.findByPlacementCode(code)
                .orElseThrow(() -> new ResourceNotFoundException("PrivatePlacement", "placementCode", code));
    }

    public List<PrivatePlacement> getAllPlacements() {
        return placementRepository.findAll();
    }
}

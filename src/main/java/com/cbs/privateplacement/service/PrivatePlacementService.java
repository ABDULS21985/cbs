package com.cbs.privateplacement.service;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.privateplacement.entity.PlacementInvestor;
import com.cbs.privateplacement.entity.PrivatePlacement;
import com.cbs.privateplacement.repository.PlacementInvestorRepository;
import com.cbs.privateplacement.repository.PrivatePlacementRepository;
import lombok.RequiredArgsConstructor; import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service; import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal; import java.util.List; import java.util.UUID;
@Service @RequiredArgsConstructor @Slf4j @Transactional(readOnly = true)
public class PrivatePlacementService {
    private final PrivatePlacementRepository placementRepository;
    private final PlacementInvestorRepository investorRepository;

    @Transactional public PrivatePlacement createPlacement(PrivatePlacement placement) {
        placement.setPlacementCode("PP-" + UUID.randomUUID().toString().substring(0, 10).toUpperCase());
        placement.setStatus("STRUCTURING");
        return placementRepository.save(placement);
    }

    @Transactional public PlacementInvestor addInvestor(String placementCode, PlacementInvestor investor) {
        PrivatePlacement placement = getByCode(placementCode);
        investor.setPlacementId(placement.getId());
        investor.setStatus("COMMITTED");
        PlacementInvestor saved = investorRepository.save(investor);
        placement.setCurrentInvestors(placement.getCurrentInvestors() + 1);
        placementRepository.save(placement);
        return saved;
    }

    @Transactional public PlacementInvestor recordFunding(String placementCode, Long investorId) {
        PrivatePlacement placement = getByCode(placementCode);
        PlacementInvestor investor = investorRepository.findById(investorId).orElseThrow(() -> new ResourceNotFoundException("PlacementInvestor", "id", investorId));
        investor.setPaidAmount(investor.getCommitmentAmount());
        investor.setStatus("FUNDED");
        investorRepository.save(investor);
        placement.setRaisedAmount(placement.getRaisedAmount().add(investor.getCommitmentAmount()));
        placementRepository.save(placement);
        return investor;
    }

    @Transactional public PrivatePlacement closePlacement(String placementCode) {
        PrivatePlacement placement = getByCode(placementCode);
        BigDecimal threshold = placement.getTargetAmount().multiply(new BigDecimal("0.8"));
        if (placement.getRaisedAmount().compareTo(threshold) < 0) {
            throw new IllegalStateException("Cannot close: raised amount " + placement.getRaisedAmount() + " is below 80% of target " + placement.getTargetAmount());
        }
        placement.setStatus("CLOSED");
        return placementRepository.save(placement);
    }

    public List<PrivatePlacement> getActivePlacements() { return placementRepository.findByStatusInOrderByClosingDateAsc(List.of("STRUCTURING", "MARKETING", "SUBSCRIPTION")); }

    public List<PlacementInvestor> getInvestorBook(String placementCode) {
        PrivatePlacement placement = getByCode(placementCode);
        return investorRepository.findByPlacementIdOrderByCommitmentAmountDesc(placement.getId());
    }

    public PrivatePlacement getByCode(String code) { return placementRepository.findByPlacementCode(code).orElseThrow(() -> new ResourceNotFoundException("PrivatePlacement", "placementCode", code)); }

    public java.util.List<PrivatePlacement> getAllPlacements() {
        return placementRepository.findAll();
    }

}

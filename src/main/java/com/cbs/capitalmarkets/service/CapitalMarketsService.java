package com.cbs.capitalmarkets.service;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.capitalmarkets.entity.CapitalMarketDeal;
import com.cbs.capitalmarkets.entity.DealInvestor;
import com.cbs.capitalmarkets.repository.CapitalMarketDealRepository;
import com.cbs.capitalmarkets.repository.DealInvestorRepository;
import lombok.RequiredArgsConstructor; import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service; import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal; import java.math.RoundingMode; import java.util.List; import java.util.UUID;
@Service @RequiredArgsConstructor @Slf4j @Transactional(readOnly = true)
public class CapitalMarketsService {
    private final CapitalMarketDealRepository dealRepository;
    private final DealInvestorRepository investorRepository;

    @Transactional public CapitalMarketDeal createDeal(CapitalMarketDeal deal) {
        deal.setDealCode("CMD-" + UUID.randomUUID().toString().substring(0, 10).toUpperCase());
        deal.setStatus("MANDATE");
        return dealRepository.save(deal);
    }

    @Transactional public DealInvestor addInvestorBid(Long dealId, DealInvestor investor) {
        CapitalMarketDeal deal = getByCode(dealRepository.findById(dealId).orElseThrow(() -> new ResourceNotFoundException("CapitalMarketDeal", "id", dealId)).getDealCode());
        investor.setDealId(dealId);
        investor.setStatus("BID_RECEIVED");
        DealInvestor saved = investorRepository.save(investor);
        recalculateSubscription(deal);
        return saved;
    }

    @Transactional public CapitalMarketDeal executePricing(String dealCode, BigDecimal price) {
        CapitalMarketDeal deal = getByCode(dealCode);
        deal.setIssuePrice(price);
        deal.setStatus("PRICED");
        return dealRepository.save(deal);
    }

    @Transactional public CapitalMarketDeal executeAllotment(String dealCode, String method) {
        CapitalMarketDeal deal = getByCode(dealCode);
        deal.setAllocationMethod(method);
        deal.setStatus("ALLOTTED");
        List<DealInvestor> investors = investorRepository.findByDealIdOrderByBidAmountDesc(deal.getId());
        if ("PRO_RATA".equals(method)) {
            BigDecimal totalBids = investors.stream().map(DealInvestor::getBidAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
            if (totalBids.compareTo(BigDecimal.ZERO) > 0) {
                BigDecimal actualAmount = deal.getActualAmount() != null && deal.getActualAmount().compareTo(BigDecimal.ZERO) > 0 ? deal.getActualAmount() : deal.getTargetAmount();
                for (DealInvestor inv : investors) {
                    BigDecimal allotted = inv.getBidAmount().multiply(actualAmount).divide(totalBids, 4, RoundingMode.HALF_UP);
                    inv.setAllottedAmount(allotted);
                    inv.setStatus("ALLOTTED");
                }
                investorRepository.saveAll(investors);
            }
        }
        return dealRepository.save(deal);
    }

    @Transactional public CapitalMarketDeal settleAllotment(String dealCode) {
        CapitalMarketDeal deal = getByCode(dealCode);
        deal.setStatus("SETTLED");
        return dealRepository.save(deal);
    }

    public List<CapitalMarketDeal> getDealPipeline() {
        return dealRepository.findByStatusInOrderByMandateDateDesc(List.of("MANDATE", "STRUCTURING", "REGULATORY_REVIEW", "BOOK_BUILDING", "PRICED", "ALLOTTED"));
    }

    public List<DealInvestor> getInvestorBook(Long dealId) { return investorRepository.findByDealIdOrderByBidAmountDesc(dealId); }

    public List<CapitalMarketDeal> getRevenueReport() {
        return dealRepository.findByStatusInOrderByMandateDateDesc(List.of("SETTLED", "LISTED"));
    }

    public CapitalMarketDeal getByCode(String dealCode) { return dealRepository.findByDealCode(dealCode).orElseThrow(() -> new ResourceNotFoundException("CapitalMarketDeal", "dealCode", dealCode)); }

    private void recalculateSubscription(CapitalMarketDeal deal) {
        List<DealInvestor> investors = investorRepository.findByDealIdOrderByBidAmountDesc(deal.getId());
        BigDecimal totalBids = investors.stream().map(DealInvestor::getBidAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
        deal.setActualAmount(totalBids);
        if (deal.getTargetAmount().compareTo(BigDecimal.ZERO) > 0) {
            deal.setSubscriptionLevel(totalBids.divide(deal.getTargetAmount(), 2, RoundingMode.HALF_UP));
        }
        dealRepository.save(deal);
    }
}

package com.cbs.leasing.service;

import com.cbs.common.audit.CurrentActorProvider;
import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.leasing.entity.CorporateLeasePortfolio;
import com.cbs.leasing.repository.CorporateLeasePortfolioRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service @RequiredArgsConstructor @Slf4j @Transactional(readOnly = true)
public class CorporateLeaseService {

    private final CorporateLeasePortfolioRepository portfolioRepository;
    private final CurrentActorProvider currentActorProvider;

    @Transactional
    public CorporateLeasePortfolio createPortfolio(CorporateLeasePortfolio portfolio) {
        // Input validation
        if (portfolio.getCorporateCustomerId() == null) {
            throw new BusinessException("corporateCustomerId is required", "MISSING_CUSTOMER_ID");
        }
        if (portfolio.getTotalLeases() != null && portfolio.getTotalLeases() < 0) {
            throw new BusinessException("totalLeases cannot be negative", "INVALID_TOTAL_LEASES");
        }
        if (portfolio.getActiveLeases() != null && portfolio.getActiveLeases() < 0) {
            throw new BusinessException("activeLeases cannot be negative", "INVALID_ACTIVE_LEASES");
        }
        if (portfolio.getWeightedAvgRate() != null && portfolio.getWeightedAvgRate().compareTo(BigDecimal.ZERO) <= 0) {
            throw new BusinessException("weightedAvgRate must be greater than zero", "INVALID_RATE");
        }

        // Duplicate check: one portfolio per customer per date
        portfolioRepository.findFirstByCorporateCustomerIdOrderByAsOfDateDesc(portfolio.getCorporateCustomerId())
                .filter(existing -> LocalDate.now().equals(existing.getAsOfDate()))
                .ifPresent(existing -> {
                    throw new BusinessException("Portfolio already exists for customer " + portfolio.getCorporateCustomerId() + " on " + LocalDate.now(), "DUPLICATE_PORTFOLIO");
                });

        portfolio.setAsOfDate(LocalDate.now());
        CorporateLeasePortfolio saved = portfolioRepository.save(portfolio);
        log.info("AUDIT: Corporate lease portfolio created by {}: customerId={}, totalLeases={}",
                currentActorProvider.getCurrentActor(), saved.getCorporateCustomerId(), saved.getTotalLeases());
        return saved;
    }

    @Transactional
    public CorporateLeasePortfolio updatePortfolio(Long portfolioId, CorporateLeasePortfolio updates) {
        CorporateLeasePortfolio portfolio = getById(portfolioId);
        // Null-safe updates: only update fields that are provided
        if (updates.getTotalLeases() != null) {
            if (updates.getTotalLeases() < 0) throw new BusinessException("totalLeases cannot be negative", "INVALID_TOTAL_LEASES");
            portfolio.setTotalLeases(updates.getTotalLeases());
        }
        if (updates.getActiveLeases() != null) {
            if (updates.getActiveLeases() < 0) throw new BusinessException("activeLeases cannot be negative", "INVALID_ACTIVE_LEASES");
            portfolio.setActiveLeases(updates.getActiveLeases());
        }
        if (updates.getTotalRouAssetValue() != null) portfolio.setTotalRouAssetValue(updates.getTotalRouAssetValue());
        if (updates.getTotalLeaseLiability() != null) portfolio.setTotalLeaseLiability(updates.getTotalLeaseLiability());
        if (updates.getWeightedAvgTerm() != null) portfolio.setWeightedAvgTerm(updates.getWeightedAvgTerm());
        if (updates.getWeightedAvgRate() != null) {
            if (updates.getWeightedAvgRate().compareTo(BigDecimal.ZERO) <= 0) throw new BusinessException("weightedAvgRate must be greater than zero", "INVALID_RATE");
            portfolio.setWeightedAvgRate(updates.getWeightedAvgRate());
        }
        if (updates.getAnnualLeaseExpense() != null) portfolio.setAnnualLeaseExpense(updates.getAnnualLeaseExpense());
        if (updates.getExpiringNext90Days() != null) portfolio.setExpiringNext90Days(updates.getExpiringNext90Days());
        if (updates.getExpiringNext180Days() != null) portfolio.setExpiringNext180Days(updates.getExpiringNext180Days());
        portfolio.setAsOfDate(LocalDate.now());
        CorporateLeasePortfolio saved = portfolioRepository.save(portfolio);
        log.info("AUDIT: Corporate lease portfolio updated by {}: portfolioId={}", currentActorProvider.getCurrentActor(), portfolioId);
        return saved;
    }

    public CorporateLeasePortfolio getPortfolioSummary(Long corporateCustomerId) {
        return portfolioRepository.findFirstByCorporateCustomerIdOrderByAsOfDateDesc(corporateCustomerId)
                .orElseThrow(() -> new ResourceNotFoundException("CorporateLeasePortfolio", "corporateCustomerId", corporateCustomerId));
    }

    /**
     * Returns maturity analysis: portfolios grouped by time horizon showing
     * expiring lease counts within 90-day and 180-day windows.
     */
    public List<CorporateLeasePortfolio> getMaturityProfile(Long corporateCustomerId) {
        List<CorporateLeasePortfolio> portfolios = portfolioRepository.findByCorporateCustomerId(corporateCustomerId);
        if (portfolios.isEmpty()) {
            throw new ResourceNotFoundException("CorporateLeasePortfolio", "corporateCustomerId", corporateCustomerId);
        }
        // Sort by asOfDate descending to show most recent maturity snapshots first
        return portfolios.stream()
                .sorted(Comparator.comparing(CorporateLeasePortfolio::getAsOfDate).reversed())
                .collect(Collectors.toList());
    }

    public List<CorporateLeasePortfolio> getAllPortfolios() {
        return portfolioRepository.findAll();
    }

    private CorporateLeasePortfolio getById(Long id) {
        return portfolioRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("CorporateLeasePortfolio", "id", id));
    }
}

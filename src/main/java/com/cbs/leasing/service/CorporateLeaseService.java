package com.cbs.leasing.service;

import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.leasing.entity.CorporateLeasePortfolio;
import com.cbs.leasing.repository.CorporateLeasePortfolioRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

@Service @RequiredArgsConstructor @Slf4j @Transactional(readOnly = true)
public class CorporateLeaseService {

    private final CorporateLeasePortfolioRepository portfolioRepository;

    @Transactional
    public CorporateLeasePortfolio createPortfolio(CorporateLeasePortfolio portfolio) {
        portfolio.setAsOfDate(LocalDate.now());
        CorporateLeasePortfolio saved = portfolioRepository.save(portfolio);
        log.info("Corporate lease portfolio created: customerId={}, totalLeases={}", saved.getCorporateCustomerId(), saved.getTotalLeases());
        return saved;
    }

    @Transactional
    public CorporateLeasePortfolio updatePortfolio(Long portfolioId, CorporateLeasePortfolio updates) {
        CorporateLeasePortfolio portfolio = getById(portfolioId);
        portfolio.setTotalLeases(updates.getTotalLeases());
        portfolio.setActiveLeases(updates.getActiveLeases());
        portfolio.setTotalRouAssetValue(updates.getTotalRouAssetValue());
        portfolio.setTotalLeaseLiability(updates.getTotalLeaseLiability());
        portfolio.setWeightedAvgTerm(updates.getWeightedAvgTerm());
        portfolio.setWeightedAvgRate(updates.getWeightedAvgRate());
        portfolio.setAnnualLeaseExpense(updates.getAnnualLeaseExpense());
        portfolio.setExpiringNext90Days(updates.getExpiringNext90Days());
        portfolio.setExpiringNext180Days(updates.getExpiringNext180Days());
        portfolio.setAsOfDate(LocalDate.now());
        return portfolioRepository.save(portfolio);
    }

    public CorporateLeasePortfolio getPortfolioSummary(Long corporateCustomerId) {
        return portfolioRepository.findFirstByCorporateCustomerIdOrderByAsOfDateDesc(corporateCustomerId)
                .orElseThrow(() -> new ResourceNotFoundException("CorporateLeasePortfolio", "corporateCustomerId", corporateCustomerId));
    }

    public List<CorporateLeasePortfolio> getMaturityProfile(Long corporateCustomerId) {
        return portfolioRepository.findByCorporateCustomerId(corporateCustomerId);
    }

    public List<CorporateLeasePortfolio> getAllPortfolios() {
        return portfolioRepository.findAll();
    }

    private CorporateLeasePortfolio getById(Long id) {
        return portfolioRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("CorporateLeasePortfolio", "id", id));
    }
}

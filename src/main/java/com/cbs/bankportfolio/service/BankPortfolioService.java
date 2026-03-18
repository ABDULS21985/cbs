package com.cbs.bankportfolio.service;
import com.cbs.bankportfolio.entity.BankPortfolio;
import com.cbs.bankportfolio.repository.BankPortfolioRepository;
import lombok.RequiredArgsConstructor; import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service; import org.springframework.transaction.annotation.Transactional;
import java.util.*;
@Service @RequiredArgsConstructor @Slf4j @Transactional(readOnly = true)
public class BankPortfolioService {
    private final BankPortfolioRepository portfolioRepository;
    @Transactional public BankPortfolio create(BankPortfolio p) { return portfolioRepository.save(p); }
    public List<BankPortfolio> getByType(String type) { return portfolioRepository.findByPortfolioTypeAndStatusOrderByPortfolioNameAsc(type, "ACTIVE"); }
    public List<BankPortfolio> getAll() { return portfolioRepository.findByStatusOrderByPortfolioNameAsc("ACTIVE"); }
}

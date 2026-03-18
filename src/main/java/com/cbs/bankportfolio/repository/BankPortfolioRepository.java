package com.cbs.bankportfolio.repository;
import com.cbs.bankportfolio.entity.BankPortfolio;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List; import java.util.Optional;
public interface BankPortfolioRepository extends JpaRepository<BankPortfolio, Long> {
    Optional<BankPortfolio> findByPortfolioCode(String code);
    List<BankPortfolio> findByPortfolioTypeAndStatusOrderByPortfolioNameAsc(String type, String status);
    List<BankPortfolio> findByStatusOrderByPortfolioNameAsc(String status);
}

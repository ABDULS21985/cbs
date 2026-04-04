package com.cbs.gl.repository;

import com.cbs.gl.entity.GlBalance;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface GlBalanceRepository extends JpaRepository<GlBalance, Long> {
    Optional<GlBalance> findByGlCodeAndBranchCodeAndCurrencyCodeAndBalanceDate(String glCode, String branchCode, String currencyCode, LocalDate date);
    List<GlBalance> findByGlCodeAndBalanceDate(String glCode, LocalDate date);
    List<GlBalance> findByBalanceDateOrderByGlCodeAsc(LocalDate date);
    List<GlBalance> findByGlCodeAndBalanceDateBetweenOrderByBalanceDateAsc(String glCode, LocalDate from, LocalDate to);
    List<GlBalance> findByGlCodeInAndBalanceDate(Collection<String> glCodes, LocalDate date);
}

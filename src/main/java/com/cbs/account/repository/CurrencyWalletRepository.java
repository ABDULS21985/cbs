package com.cbs.account.repository;

import com.cbs.account.entity.CurrencyWallet;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface CurrencyWalletRepository extends JpaRepository<CurrencyWallet, Long> {
    List<CurrencyWallet> findByAccountIdAndStatus(Long accountId, String status);
    Optional<CurrencyWallet> findByAccountIdAndCurrencyCode(Long accountId, String currencyCode);
}

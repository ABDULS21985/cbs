package com.cbs.counterparty.repository;

import com.cbs.counterparty.entity.Counterparty;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface CounterpartyRepository extends JpaRepository<Counterparty, Long> {
    Optional<Counterparty> findByCounterpartyCode(String code);
    Optional<Counterparty> findByLei(String lei);
    List<Counterparty> findAllByOrderByCounterpartyNameAsc();
    List<Counterparty> findByCounterpartyTypeAndStatusOrderByCounterpartyNameAsc(String type, String status);
    List<Counterparty> findByKycStatusOrderByCounterpartyNameAsc(String kycStatus);
}

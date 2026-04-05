package com.cbs.zakat.repository;

import com.cbs.zakat.entity.ZakatDomainEnums;
import com.cbs.zakat.entity.ZatcaReturn;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ZatcaReturnRepository extends JpaRepository<ZatcaReturn, UUID> {

    Optional<ZatcaReturn> findByReturnRef(String returnRef);

    Optional<ZatcaReturn> findByComputationId(UUID computationId);

    Optional<ZatcaReturn> findFirstByZakatYearOrderByCreatedAtDesc(Integer zakatYear);

    List<ZatcaReturn> findByStatusOrderByCreatedAtDesc(ZakatDomainEnums.ZatcaReturnStatus status);

    List<ZatcaReturn> findAllByOrderByCreatedAtDesc();
}
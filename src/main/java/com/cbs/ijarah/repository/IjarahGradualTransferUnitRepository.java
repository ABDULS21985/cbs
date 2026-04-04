package com.cbs.ijarah.repository;

import com.cbs.ijarah.entity.IjarahGradualTransferUnit;
import com.cbs.ijarah.entity.IjarahDomainEnums;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface IjarahGradualTransferUnitRepository extends JpaRepository<IjarahGradualTransferUnit, Long> {

    List<IjarahGradualTransferUnit> findByTransferMechanismIdOrderByUnitNumberAsc(Long transferMechanismId);

    Optional<IjarahGradualTransferUnit> findByTransferMechanismIdAndUnitNumber(Long transferMechanismId, Integer unitNumber);

    List<IjarahGradualTransferUnit> findByScheduledDateLessThanEqualAndStatus(LocalDate scheduledDate, IjarahDomainEnums.UnitTransferStatus status);
}

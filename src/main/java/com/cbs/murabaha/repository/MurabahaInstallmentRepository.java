package com.cbs.murabaha.repository;

import com.cbs.murabaha.entity.MurabahaDomainEnums;
import com.cbs.murabaha.entity.MurabahaInstallment;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface MurabahaInstallmentRepository extends JpaRepository<MurabahaInstallment, Long> {

    List<MurabahaInstallment> findByContractIdOrderByInstallmentNumberAsc(Long contractId);

    Optional<MurabahaInstallment> findFirstByContractIdAndStatusInOrderByInstallmentNumberAsc(
            Long contractId,
            Collection<MurabahaDomainEnums.InstallmentStatus> statuses
    );

    List<MurabahaInstallment> findByContractIdAndStatusInOrderByInstallmentNumberAsc(
            Long contractId,
            Collection<MurabahaDomainEnums.InstallmentStatus> statuses
    );

    @Lock(LockModeType.OPTIMISTIC_FORCE_INCREMENT)
    @Query("SELECT i FROM MurabahaInstallment i WHERE i.contractId = :contractId AND i.status IN :statuses ORDER BY i.installmentNumber ASC")
    List<MurabahaInstallment> findUnpaidWithLock(
            @Param("contractId") Long contractId,
            @Param("statuses") Collection<MurabahaDomainEnums.InstallmentStatus> statuses);

    List<MurabahaInstallment> findByStatusInAndDueDateBefore(Collection<MurabahaDomainEnums.InstallmentStatus> statuses,
                                                             LocalDate dueDate);

    boolean existsByContractId(Long contractId);

    boolean existsByTransactionRef(String transactionRef);
}

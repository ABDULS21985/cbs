package com.cbs.musharakah.repository;

import com.cbs.musharakah.entity.MusharakahDomainEnums;
import com.cbs.musharakah.entity.MusharakahRentalInstallment;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface MusharakahRentalInstallmentRepository extends JpaRepository<MusharakahRentalInstallment, Long> {

    List<MusharakahRentalInstallment> findByContractIdOrderByInstallmentNumberAsc(Long contractId);

    Optional<MusharakahRentalInstallment> findFirstByContractIdAndStatusInOrderByInstallmentNumberAsc(
            Long contractId,
            List<MusharakahDomainEnums.InstallmentStatus> statuses);

    List<MusharakahRentalInstallment> findByContractIdAndStatusInOrderByInstallmentNumberAsc(
            Long contractId,
            List<MusharakahDomainEnums.InstallmentStatus> statuses);

    @Lock(LockModeType.OPTIMISTIC_FORCE_INCREMENT)
    @Query("SELECT r FROM MusharakahRentalInstallment r WHERE r.contractId = :contractId AND r.status IN :statuses ORDER BY r.installmentNumber ASC")
    List<MusharakahRentalInstallment> findUnpaidWithLock(
            @Param("contractId") Long contractId,
            @Param("statuses") List<MusharakahDomainEnums.InstallmentStatus> statuses);

    List<MusharakahRentalInstallment> findByStatusInAndDueDateBefore(
            List<MusharakahDomainEnums.InstallmentStatus> statuses,
            LocalDate dueDate);
}

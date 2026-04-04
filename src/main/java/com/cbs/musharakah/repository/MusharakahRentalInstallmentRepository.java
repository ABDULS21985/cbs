package com.cbs.musharakah.repository;

import com.cbs.musharakah.entity.MusharakahDomainEnums;
import com.cbs.musharakah.entity.MusharakahRentalInstallment;
import org.springframework.data.jpa.repository.JpaRepository;
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

    List<MusharakahRentalInstallment> findByStatusInAndDueDateBefore(
            List<MusharakahDomainEnums.InstallmentStatus> statuses,
            LocalDate dueDate);
}

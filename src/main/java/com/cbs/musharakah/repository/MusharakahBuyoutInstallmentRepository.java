package com.cbs.musharakah.repository;

import com.cbs.musharakah.entity.MusharakahBuyoutInstallment;
import com.cbs.musharakah.entity.MusharakahDomainEnums;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface MusharakahBuyoutInstallmentRepository extends JpaRepository<MusharakahBuyoutInstallment, Long> {

    List<MusharakahBuyoutInstallment> findByContractIdOrderByInstallmentNumberAsc(Long contractId);

    Optional<MusharakahBuyoutInstallment> findFirstByContractIdAndStatusInOrderByInstallmentNumberAsc(
            Long contractId,
            List<MusharakahDomainEnums.InstallmentStatus> statuses);

    List<MusharakahBuyoutInstallment> findByContractIdAndStatusInOrderByInstallmentNumberAsc(
            Long contractId,
            List<MusharakahDomainEnums.InstallmentStatus> statuses);

    List<MusharakahBuyoutInstallment> findByStatusInAndDueDateBefore(
            List<MusharakahDomainEnums.InstallmentStatus> statuses,
            LocalDate dueDate);
}

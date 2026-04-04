package com.cbs.ijarah.repository;

import com.cbs.ijarah.entity.IjarahAssetMaintenanceRecord;
import com.cbs.ijarah.entity.IjarahDomainEnums;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface IjarahAssetMaintenanceRecordRepository extends JpaRepository<IjarahAssetMaintenanceRecord, Long> {

    List<IjarahAssetMaintenanceRecord> findByAssetIdOrderByMaintenanceDateDesc(Long assetId);

    List<IjarahAssetMaintenanceRecord> findByAssetIdAndResponsibleParty(Long assetId, IjarahDomainEnums.ResponsibleParty responsibleParty);

    List<IjarahAssetMaintenanceRecord> findByMaintenanceDateBetween(LocalDate from, LocalDate to);
}

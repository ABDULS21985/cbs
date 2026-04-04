package com.cbs.ijarah.repository;

import com.cbs.ijarah.entity.IjarahDomainEnums;
import com.cbs.ijarah.entity.IjarahTransferMechanism;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface IjarahTransferMechanismRepository extends JpaRepository<IjarahTransferMechanism, Long> {

    Optional<IjarahTransferMechanism> findByTransferRef(String transferRef);

    Optional<IjarahTransferMechanism> findByIjarahContractId(Long ijarahContractId);

    List<IjarahTransferMechanism> findByStatus(IjarahDomainEnums.TransferStatus status);
}

package com.cbs.productfactory.islamic.repository;

import com.cbs.productfactory.islamic.entity.IslamicContractType;
import com.cbs.productfactory.islamic.entity.IslamicDomainEnums;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface IslamicContractTypeRepository extends JpaRepository<IslamicContractType, Long> {

    Optional<IslamicContractType> findByCodeIgnoreCase(String code);

    List<IslamicContractType> findByCategoryOrderByDisplayOrderAsc(IslamicDomainEnums.ContractCategory category);

    List<IslamicContractType> findByStatusOrderByDisplayOrderAsc(IslamicDomainEnums.ContractTypeStatus status);
}
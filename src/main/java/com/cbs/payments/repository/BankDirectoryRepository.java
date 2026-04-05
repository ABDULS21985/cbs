package com.cbs.payments.repository;

import com.cbs.payments.entity.BankDirectory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface BankDirectoryRepository extends JpaRepository<BankDirectory, Long> {

    List<BankDirectory> findByIsActiveTrueOrderByBankNameAsc();

    Optional<BankDirectory> findByBankCode(String bankCode);

    Optional<BankDirectory> findBySwiftCode(String swiftCode);
}

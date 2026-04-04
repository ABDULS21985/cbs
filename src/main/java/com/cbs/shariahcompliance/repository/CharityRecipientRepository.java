package com.cbs.shariahcompliance.repository;

import com.cbs.shariahcompliance.entity.CharityRecipient;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CharityRecipientRepository extends JpaRepository<CharityRecipient, Long> {

    Optional<CharityRecipient> findByRecipientCode(String recipientCode);

    List<CharityRecipient> findBySsbApprovedTrueAndStatus(String status);

    List<CharityRecipient> findByStatus(String status);
}

package com.cbs.customer.repository;

import com.cbs.customer.entity.OnboardingDraft;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface OnboardingDraftRepository extends JpaRepository<OnboardingDraft, Long> {
    List<OnboardingDraft> findByCreatedByOrderByUpdatedAtDesc(String createdBy);
}

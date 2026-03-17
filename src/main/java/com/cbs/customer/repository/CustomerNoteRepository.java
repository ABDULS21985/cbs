package com.cbs.customer.repository;

import com.cbs.customer.entity.CustomerNote;
import com.cbs.customer.entity.NoteType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CustomerNoteRepository extends JpaRepository<CustomerNote, Long> {

    Page<CustomerNote> findByCustomerId(Long customerId, Pageable pageable);

    Optional<CustomerNote> findByIdAndCustomerId(Long id, Long customerId);

    List<CustomerNote> findByCustomerIdAndNoteType(Long customerId, NoteType noteType);

    List<CustomerNote> findByCustomerIdAndIsPinnedTrue(Long customerId);
}

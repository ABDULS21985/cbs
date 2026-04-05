package com.cbs.shariah.repository;

import com.cbs.shariah.entity.SsbBoardMember;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface SsbBoardMemberRepository extends JpaRepository<SsbBoardMember, Long> {

    Optional<SsbBoardMember> findByMemberId(String memberId);

    Optional<SsbBoardMember> findByMemberIdIgnoreCaseAndIsActiveTrue(String memberId);

    Optional<SsbBoardMember> findByContactEmailIgnoreCaseAndIsActiveTrue(String contactEmail);

    @Query("SELECT m FROM SsbBoardMember m WHERE m.isActive = true " +
           "AND (LOWER(m.memberId) IN :identifiers OR LOWER(m.contactEmail) IN :identifiers)")
    List<SsbBoardMember> findActiveByMemberIdOrEmailIn(Collection<String> identifiers);

    List<SsbBoardMember> findByIsActiveTrueOrderByFullNameAsc();

    long countByIsActiveTrue();

    List<SsbBoardMember> findByIdInAndIsActiveTrue(List<Long> ids);

    @Query(value = "SELECT nextval('cbs.ssb_member_code_seq')", nativeQuery = true)
    Long getNextMemberCodeSequence();
}

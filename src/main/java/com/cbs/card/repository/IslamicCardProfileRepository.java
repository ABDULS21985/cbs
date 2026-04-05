package com.cbs.card.repository;

import com.cbs.card.entity.IslamicCardProfile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface IslamicCardProfileRepository extends JpaRepository<IslamicCardProfile, Long> {

    @Query("""
            select p from IslamicCardProfile p
            where p.profileCode = :profileCode
            and (p.tenantId = :tenantId or p.tenantId is null)
            order by case when p.tenantId = :tenantId then 0 else 1 end, p.id desc
            """)
    List<IslamicCardProfile> findCandidatesByProfileCode(@Param("profileCode") String profileCode,
                                                         @Param("tenantId") Long tenantId);

    default Optional<IslamicCardProfile> findByProfileCodeAndTenantScope(String profileCode, Long tenantId) {
        return findCandidatesByProfileCode(profileCode, tenantId).stream().findFirst();
    }

    @Query("""
            select p from IslamicCardProfile p
            where p.tenantId = :tenantId or p.tenantId is null
            order by case when p.tenantId = :tenantId then 0 else 1 end, p.profileCode asc
            """)
    List<IslamicCardProfile> findAllByTenantScopeOrderByProfileCodeAsc(@Param("tenantId") Long tenantId);
}
package com.cbs.card.repository;

import com.cbs.card.entity.IslamicCardProduct;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface IslamicCardProductRepository extends JpaRepository<IslamicCardProduct, Long> {

    @Query("""
            select p from IslamicCardProduct p
            where p.productCode = :productCode
            and (p.tenantId = :tenantId or p.tenantId is null)
            order by case when p.tenantId = :tenantId then 0 else 1 end, p.id desc
            """)
    List<IslamicCardProduct> findCandidatesByProductCode(@Param("productCode") String productCode,
                                                         @Param("tenantId") Long tenantId);

    default Optional<IslamicCardProduct> findByProductCodeAndTenantScope(String productCode, Long tenantId) {
        return findCandidatesByProductCode(productCode, tenantId).stream().findFirst();
    }

    @Query("""
            select p from IslamicCardProduct p
            where p.tenantId = :tenantId or p.tenantId is null
            order by case when p.tenantId = :tenantId then 0 else 1 end, p.productCode asc
            """)
    List<IslamicCardProduct> findAllByTenantScopeOrderByProductCodeAsc(@Param("tenantId") Long tenantId);
}
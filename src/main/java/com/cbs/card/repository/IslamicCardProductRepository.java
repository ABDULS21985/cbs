package com.cbs.card.repository;

import com.cbs.card.entity.IslamicCardProduct;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface IslamicCardProductRepository extends JpaRepository<IslamicCardProduct, Long> {

    Optional<IslamicCardProduct> findByProductCode(String productCode);

    List<IslamicCardProduct> findAllByOrderByProductCodeAsc();
}
package com.cbs.trade.repository;

import com.cbs.trade.entity.LcDocumentPresentation;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface LcDocumentPresentationRepository extends JpaRepository<LcDocumentPresentation, Long> {
    List<LcDocumentPresentation> findByLcIdOrderByPresentationNumberDesc(Long lcId);
    int countByLcId(Long lcId);
}

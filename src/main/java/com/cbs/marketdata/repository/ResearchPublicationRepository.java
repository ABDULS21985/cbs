package com.cbs.marketdata.repository;
import com.cbs.marketdata.entity.ResearchPublication; import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List; import java.util.Optional;
public interface ResearchPublicationRepository extends JpaRepository<ResearchPublication, Long> {
    Optional<ResearchPublication> findByPublicationCode(String code);
    List<ResearchPublication> findByStatusOrderByPublishedAtDesc(String status);
}

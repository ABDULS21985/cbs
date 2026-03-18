package com.cbs.salessupport.repository;
import com.cbs.salessupport.entity.SalesKnowledgeArticle;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List; import java.util.Optional;
public interface SalesKnowledgeArticleRepository extends JpaRepository<SalesKnowledgeArticle, Long> {
    Optional<SalesKnowledgeArticle> findByArticleCode(String code);
    List<SalesKnowledgeArticle> findByProductFamilyAndArticleTypeAndStatusOrderByTitleAsc(String family, String type, String status);
    List<SalesKnowledgeArticle> findByProductFamilyAndStatusOrderByTitleAsc(String family, String status);
    List<SalesKnowledgeArticle> findByArticleTypeAndStatusOrderByTitleAsc(String type, String status);
    List<SalesKnowledgeArticle> findByStatusOrderByTitleAsc(String status);
}

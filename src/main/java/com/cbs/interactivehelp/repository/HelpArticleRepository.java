package com.cbs.interactivehelp.repository;

import com.cbs.interactivehelp.entity.HelpArticle;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface HelpArticleRepository extends JpaRepository<HelpArticle, Long> {
    Optional<HelpArticle> findByArticleCode(String articleCode);
    List<HelpArticle> findByCategoryAndStatusOrderByViewCountDesc(String category, String status);
    List<HelpArticle> findByCategoryAndProductFamilyAndStatusOrderByViewCountDesc(String category, String productFamily, String status);
    List<HelpArticle> findByStatusOrderByViewCountDesc(String status);
}

package com.cbs.salessupport.service;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.salessupport.entity.SalesKnowledgeArticle;
import com.cbs.salessupport.entity.SalesCollateral;
import com.cbs.salessupport.repository.SalesKnowledgeArticleRepository;
import com.cbs.salessupport.repository.SalesCollateralRepository;
import lombok.RequiredArgsConstructor; import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service; import org.springframework.transaction.annotation.Transactional;
import java.time.Instant; import java.util.List; import java.util.UUID;

@Service @RequiredArgsConstructor @Slf4j @Transactional(readOnly = true)
public class SalesSupportService {
    private final SalesKnowledgeArticleRepository articleRepository;
    private final SalesCollateralRepository collateralRepository;

    @Transactional
    public SalesKnowledgeArticle createArticle(SalesKnowledgeArticle article) {
        article.setArticleCode("SKA-" + UUID.randomUUID().toString().substring(0, 10).toUpperCase());
        article.setStatus("DRAFT");
        return articleRepository.save(article);
    }
    @Transactional
    public SalesKnowledgeArticle publishArticle(String code) {
        SalesKnowledgeArticle a = articleRepository.findByArticleCode(code).orElseThrow(() -> new ResourceNotFoundException("SalesKnowledgeArticle", "articleCode", code));
        a.setStatus("PUBLISHED"); a.setPublishedAt(Instant.now());
        return articleRepository.save(a);
    }
    @Transactional
    public SalesCollateral createCollateral(SalesCollateral collateral) {
        collateral.setCollateralCode("SC-" + UUID.randomUUID().toString().substring(0, 10).toUpperCase());
        collateral.setStatus("DRAFT");
        return collateralRepository.save(collateral);
    }
    @Transactional
    public SalesCollateral publishCollateral(String code) {
        SalesCollateral c = collateralRepository.findByCollateralCode(code).orElseThrow(() -> new ResourceNotFoundException("SalesCollateral", "collateralCode", code));
        c.setStatus("PUBLISHED"); c.setPublishedAt(Instant.now());
        return collateralRepository.save(c);
    }
    public List<SalesKnowledgeArticle> searchArticles(String productFamily, String type) {
        if (productFamily != null && type != null) return articleRepository.findByProductFamilyAndArticleTypeAndStatusOrderByTitleAsc(productFamily, type, "PUBLISHED");
        if (productFamily != null) return articleRepository.findByProductFamilyAndStatusOrderByTitleAsc(productFamily, "PUBLISHED");
        if (type != null) return articleRepository.findByArticleTypeAndStatusOrderByTitleAsc(type, "PUBLISHED");
        return articleRepository.findByStatusOrderByTitleAsc("PUBLISHED");
    }
    public List<SalesCollateral> searchCollateral(String productFamily, String type) {
        if (productFamily != null && type != null) return collateralRepository.findByProductFamilyAndCollateralTypeAndStatusOrderByTitleAsc(productFamily, type, "PUBLISHED");
        if (productFamily != null) return collateralRepository.findByProductFamilyAndStatusOrderByTitleAsc(productFamily, "PUBLISHED");
        if (type != null) return collateralRepository.findByCollateralTypeAndStatusOrderByTitleAsc(type, "PUBLISHED");
        return collateralRepository.findByStatusOrderByTitleAsc("PUBLISHED");
    }
    @Transactional
    public SalesKnowledgeArticle recordView(String code) {
        SalesKnowledgeArticle a = articleRepository.findByArticleCode(code).orElseThrow(() -> new ResourceNotFoundException("SalesKnowledgeArticle", "articleCode", code));
        a.setViewCount(a.getViewCount() + 1);
        return articleRepository.save(a);
    }
}

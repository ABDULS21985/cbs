package com.cbs.salessupport.service;
import com.cbs.common.audit.CurrentActorProvider;
import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.salessupport.entity.SalesKnowledgeArticle;
import com.cbs.salessupport.entity.SalesCollateral;
import com.cbs.salessupport.repository.SalesKnowledgeArticleRepository;
import com.cbs.salessupport.repository.SalesCollateralRepository;
import lombok.RequiredArgsConstructor; import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service; import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import java.time.Instant; import java.util.List; import java.util.UUID;

@Service @RequiredArgsConstructor @Slf4j @Transactional(readOnly = true)
public class SalesSupportService {
    private final SalesKnowledgeArticleRepository articleRepository;
    private final SalesCollateralRepository collateralRepository;
    private final CurrentActorProvider currentActorProvider;

    @Transactional
    public SalesKnowledgeArticle createArticle(SalesKnowledgeArticle article) {
        if (!StringUtils.hasText(article.getTitle())) {
            throw new BusinessException("Article title is required", "MISSING_ARTICLE_TITLE");
        }
        if (!StringUtils.hasText(article.getContent())) {
            throw new BusinessException("Article content is required", "MISSING_ARTICLE_CONTENT");
        }
        if (!StringUtils.hasText(article.getProductFamily())) {
            throw new BusinessException("Product family is required", "MISSING_PRODUCT_FAMILY");
        }
        article.setArticleCode("SKA-" + UUID.randomUUID().toString().substring(0, 10).toUpperCase());
        article.setStatus("DRAFT");
        article.setViewCount(0);
        SalesKnowledgeArticle saved = articleRepository.save(article);
        log.info("AUDIT: Article created: code={}, title={}, actor={}",
                saved.getArticleCode(), saved.getTitle(), currentActorProvider.getCurrentActor());
        return saved;
    }

    @Transactional
    public SalesKnowledgeArticle publishArticle(String code) {
        SalesKnowledgeArticle a = articleRepository.findByArticleCode(code).orElseThrow(() -> new ResourceNotFoundException("SalesKnowledgeArticle", "articleCode", code));
        // State guard: only DRAFT articles can be published
        if (!"DRAFT".equals(a.getStatus())) {
            throw new BusinessException("Only DRAFT articles can be published; current status: " + a.getStatus(), "INVALID_ARTICLE_STATUS");
        }
        if (!StringUtils.hasText(a.getContent())) {
            throw new BusinessException("Article must have content before publishing", "EMPTY_ARTICLE_CONTENT");
        }
        a.setStatus("PUBLISHED"); a.setPublishedAt(Instant.now());
        SalesKnowledgeArticle saved = articleRepository.save(a);
        log.info("AUDIT: Article published: code={}, actor={}", code, currentActorProvider.getCurrentActor());
        return saved;
    }

    @Transactional
    public SalesCollateral createCollateral(SalesCollateral collateral) {
        if (!StringUtils.hasText(collateral.getTitle())) {
            throw new BusinessException("Collateral title is required", "MISSING_COLLATERAL_TITLE");
        }
        if (!StringUtils.hasText(collateral.getProductFamily())) {
            throw new BusinessException("Product family is required", "MISSING_PRODUCT_FAMILY");
        }
        collateral.setCollateralCode("SC-" + UUID.randomUUID().toString().substring(0, 10).toUpperCase());
        collateral.setStatus("DRAFT");
        SalesCollateral saved = collateralRepository.save(collateral);
        log.info("AUDIT: Collateral created: code={}, title={}, actor={}",
                saved.getCollateralCode(), saved.getTitle(), currentActorProvider.getCurrentActor());
        return saved;
    }

    @Transactional
    public SalesCollateral publishCollateral(String code) {
        SalesCollateral c = collateralRepository.findByCollateralCode(code).orElseThrow(() -> new ResourceNotFoundException("SalesCollateral", "collateralCode", code));
        // State guard: only DRAFT collateral can be published
        if (!"DRAFT".equals(c.getStatus())) {
            throw new BusinessException("Only DRAFT collateral can be published; current status: " + c.getStatus(), "INVALID_COLLATERAL_STATUS");
        }
        c.setStatus("PUBLISHED"); c.setPublishedAt(Instant.now());
        SalesCollateral saved = collateralRepository.save(c);
        log.info("AUDIT: Collateral published: code={}, actor={}", code, currentActorProvider.getCurrentActor());
        return saved;
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
        // Atomic view count increment via optimistic locking on the entity version
        a.setViewCount((a.getViewCount() != null ? a.getViewCount() : 0) + 1);
        return articleRepository.save(a);
    }
}

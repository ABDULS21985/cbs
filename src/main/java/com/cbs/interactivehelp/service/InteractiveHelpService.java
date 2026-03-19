package com.cbs.interactivehelp.service;

import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.interactivehelp.entity.GuidedFlow;
import com.cbs.interactivehelp.entity.HelpArticle;
import com.cbs.interactivehelp.repository.GuidedFlowRepository;
import com.cbs.interactivehelp.repository.HelpArticleRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class InteractiveHelpService {

    private final HelpArticleRepository articleRepository;
    private final GuidedFlowRepository flowRepository;

    @Transactional
    public HelpArticle createArticle(HelpArticle article) {
        article.setArticleCode("HA-" + UUID.randomUUID().toString().substring(0, 10).toUpperCase());
        return articleRepository.save(article);
    }

    @Transactional
    public HelpArticle publishArticle(String articleCode) {
        HelpArticle article = getArticleByCode(articleCode);
        if (!"REVIEWED".equals(article.getStatus())) {
            throw new BusinessException("Article " + articleCode + " must be REVIEWED to publish; current status: " + article.getStatus());
        }
        article.setStatus("PUBLISHED");
        article.setPublishedAt(Instant.now());
        return articleRepository.save(article);
    }

    @Transactional
    public GuidedFlow createFlow(GuidedFlow flow) {
        flow.setFlowCode("GF-" + UUID.randomUUID().toString().substring(0, 10).toUpperCase());
        return flowRepository.save(flow);
    }

    @Transactional
    public GuidedFlow activateFlow(String flowCode) {
        GuidedFlow flow = getFlowByCode(flowCode);
        flow.setStatus("ACTIVE");
        return flowRepository.save(flow);
    }

    @Transactional
    public HelpArticle recordView(String articleCode) {
        HelpArticle article = getArticleByCode(articleCode);
        article.setViewCount(article.getViewCount() + 1);
        return articleRepository.save(article);
    }

    @Transactional
    public HelpArticle recordHelpfulness(String articleCode, boolean helpful) {
        HelpArticle article = getArticleByCode(articleCode);
        if (helpful) {
            article.setHelpfulnessYes(article.getHelpfulnessYes() + 1);
        } else {
            article.setHelpfulnessNo(article.getHelpfulnessNo() + 1);
        }
        return articleRepository.save(article);
    }

    public List<HelpArticle> getAllArticles() { return articleRepository.findAll(); }
    public List<GuidedFlow> getAllFlows() { return flowRepository.findAll(); }

    public List<HelpArticle> searchArticles(String category, String productFamily) {
        if (productFamily != null && !productFamily.isEmpty()) {
            return articleRepository.findByCategoryAndProductFamilyAndStatusOrderByViewCountDesc(category, productFamily, "PUBLISHED");
        }
        return articleRepository.findByCategoryAndStatusOrderByViewCountDesc(category, "PUBLISHED");
    }

    @Transactional
    public GuidedFlow startFlow(String flowCode) {
        GuidedFlow flow = getFlowByCode(flowCode);
        flow.setTotalStarts(flow.getTotalStarts() + 1);
        return flowRepository.save(flow);
    }

    @Transactional
    public GuidedFlow completeFlow(String flowCode) {
        GuidedFlow flow = getFlowByCode(flowCode);
        flow.setTotalCompletions(flow.getTotalCompletions() + 1);
        if (flow.getTotalStarts() > 0) {
            BigDecimal rate = BigDecimal.valueOf(flow.getTotalCompletions())
                    .divide(BigDecimal.valueOf(flow.getTotalStarts()), 4, RoundingMode.HALF_UP)
                    .multiply(new BigDecimal("100"))
                    .setScale(2, RoundingMode.HALF_UP);
            flow.setCompletionRatePct(rate);
        }
        return flowRepository.save(flow);
    }

    private HelpArticle getArticleByCode(String code) {
        return articleRepository.findByArticleCode(code)
                .orElseThrow(() -> new ResourceNotFoundException("HelpArticle", "articleCode", code));
    }

    private GuidedFlow getFlowByCode(String code) {
        return flowRepository.findByFlowCode(code)
                .orElseThrow(() -> new ResourceNotFoundException("GuidedFlow", "flowCode", code));
    }
}

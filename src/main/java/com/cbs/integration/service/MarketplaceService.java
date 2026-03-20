package com.cbs.integration.service;

import com.cbs.common.audit.CurrentActorProvider;
import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.integration.entity.*;
import com.cbs.integration.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.*;

@Service @RequiredArgsConstructor @Slf4j @Transactional(readOnly = true)
public class MarketplaceService {

    private final MarketplaceApiProductRepository productRepository;
    private final MarketplaceSubscriptionRepository subscriptionRepository;
    private final MarketplaceUsageLogRepository usageLogRepository;
    private final CurrentActorProvider currentActorProvider;

    // ── API Product Catalog ──────────────────────────────────

    @Transactional
    public MarketplaceApiProduct createProduct(MarketplaceApiProduct product) {
        productRepository.findByProductCode(product.getProductCode()).ifPresent(p -> {
            throw new BusinessException("Product code already exists: " + product.getProductCode());
        });
        MarketplaceApiProduct saved = productRepository.save(product);
        log.info("Marketplace product created: code={}, category={}", saved.getProductCode(), saved.getProductCategory());
        return saved;
    }

    @Transactional
    public MarketplaceApiProduct publishProduct(Long productId) {
        MarketplaceApiProduct product = productRepository.findById(productId)
                .orElseThrow(() -> new ResourceNotFoundException("MarketplaceApiProduct", "id", productId));
        if (!"DRAFT".equals(product.getStatus())) {
            throw new BusinessException("Only DRAFT products can be published; current: " + product.getStatus());
        }
        product.setStatus("PUBLISHED");
        product.setPublishedAt(Instant.now());
        log.info("Marketplace product published: code={}", product.getProductCode());
        return productRepository.save(product);
    }

    @Transactional
    public MarketplaceApiProduct deprecateProduct(Long productId) {
        MarketplaceApiProduct product = productRepository.findById(productId)
                .orElseThrow(() -> new ResourceNotFoundException("MarketplaceApiProduct", "id", productId));
        product.setStatus("DEPRECATED");
        product.setDeprecatedAt(Instant.now());
        return productRepository.save(product);
    }

    public List<MarketplaceApiProduct> getPublishedProducts() {
        return productRepository.findByStatusOrderByProductNameAsc("PUBLISHED");
    }

    public List<MarketplaceApiProduct> getByCategory(String category) {
        return productRepository.findByProductCategoryAndStatusOrderByProductNameAsc(category, "PUBLISHED");
    }

    // ── Subscriptions ────────────────────────────────────────

    @Transactional
    public MarketplaceSubscription subscribe(Long productId, String subscriberName, String subscriberEmail, String planTier) {
        MarketplaceApiProduct product = productRepository.findById(productId)
                .orElseThrow(() -> new ResourceNotFoundException("MarketplaceApiProduct", "id", productId));
        if (!"PUBLISHED".equals(product.getStatus())) {
            throw new BusinessException("Cannot subscribe to non-published product: " + product.getStatus());
        }

        String subId = "SUB-" + UUID.randomUUID().toString().substring(0, 12).toUpperCase();
        int callLimit = switch (planTier) {
            case "FREE" -> 100;
            case "BASIC" -> 1000;
            case "STANDARD" -> 10000;
            case "PREMIUM" -> 100000;
            case "ENTERPRISE", "UNLIMITED" -> Integer.MAX_VALUE;
            default -> 1000;
        };

        MarketplaceSubscription sub = MarketplaceSubscription.builder()
                .subscriptionId(subId).apiProductId(productId)
                .subscriberName(subscriberName).subscriberEmail(subscriberEmail)
                .planTier(planTier).monthlyCallLimit(callLimit)
                .billingStartDate(LocalDate.now())
                .status(product.getRequiresApproval() ? "PENDING" : "ACTIVE").build();

        MarketplaceSubscription saved = subscriptionRepository.save(sub);
        log.info("Marketplace subscription: id={}, product={}, subscriber={}, status={}",
                subId, product.getProductCode(), subscriberName, saved.getStatus());
        return saved;
    }

    @Transactional
    public MarketplaceSubscription approveSubscription(String subscriptionId) {
        MarketplaceSubscription sub = subscriptionRepository.findBySubscriptionId(subscriptionId)
                .orElseThrow(() -> new ResourceNotFoundException("MarketplaceSubscription", "subscriptionId", subscriptionId));
        if (!"PENDING".equals(sub.getStatus())) {
            throw new BusinessException("Only PENDING subscriptions can be approved");
        }
        String approvedBy = currentActorProvider.getCurrentActor();
        sub.setStatus("ACTIVE");
        sub.setApprovedBy(approvedBy);
        sub.setApprovedAt(Instant.now());
        return subscriptionRepository.save(sub);
    }

    // ── Usage Tracking ───────────────────────────────────────

    @Transactional
    public MarketplaceUsageLog recordUsage(Long subscriptionId, String endpointPath, String httpMethod,
                                            int responseCode, int responseTimeMs, String ipAddress) {
        MarketplaceSubscription sub = subscriptionRepository.findById(subscriptionId)
                .orElseThrow(() -> new ResourceNotFoundException("MarketplaceSubscription", "id", subscriptionId));

        if (!"ACTIVE".equals(sub.getStatus())) {
            throw new BusinessException("Subscription is not active: " + sub.getStatus());
        }
        if (!sub.hasCallsRemaining()) {
            throw new BusinessException("Monthly call limit exceeded for subscription: " + sub.getSubscriptionId());
        }

        sub.setCallsThisMonth(sub.getCallsThisMonth() + 1);
        subscriptionRepository.save(sub);

        MarketplaceUsageLog usage = MarketplaceUsageLog.builder()
                .subscriptionId(subscriptionId).apiProductId(sub.getApiProductId())
                .endpointPath(endpointPath).httpMethod(httpMethod)
                .responseCode(responseCode).responseTimeMs(responseTimeMs)
                .ipAddress(ipAddress).build();

        return usageLogRepository.save(usage);
    }

    public List<MarketplaceSubscription> getAllSubscriptions() { return subscriptionRepository.findAll(); }
    public List<MarketplaceUsageLog> getAllUsageLogs() { return usageLogRepository.findAll(); }

    public Map<String, Object> getProductAnalytics(Long productId) {
        Instant last30d = Instant.now().minus(30, ChronoUnit.DAYS);
        Double avgResponseTime = usageLogRepository.avgResponseTimeByProduct(productId, last30d);
        long errors = usageLogRepository.countErrorsByProduct(productId, last30d);

        List<MarketplaceSubscription> activeSubs = subscriptionRepository
                .findByApiProductIdAndStatusOrderByCreatedAtDesc(productId, "ACTIVE");

        return Map.of(
                "active_subscriptions", activeSubs.size(),
                "avg_response_time_ms", avgResponseTime != null ? Math.round(avgResponseTime) : 0,
                "error_count_30d", errors,
                "total_calls_this_month", activeSubs.stream().mapToInt(MarketplaceSubscription::getCallsThisMonth).sum()
        );
    }
}

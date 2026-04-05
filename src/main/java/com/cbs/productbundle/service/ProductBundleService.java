package com.cbs.productbundle.service;

import com.cbs.common.audit.CurrentActorProvider;
import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.productbundle.entity.*;
import com.cbs.productbundle.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class ProductBundleService {

    private final ProductBundleRepository bundleRepository;
    private final CustomerBundleEnrollmentRepository enrollmentRepository;
    private final CurrentActorProvider currentActorProvider;

    @Transactional
    public ProductBundle createBundle(ProductBundle bundle) {
        bundleRepository.findByBundleCode(bundle.getBundleCode()).ifPresent(b -> {
            throw new BusinessException("Bundle code exists: " + bundle.getBundleCode(), "DUPLICATE_BUNDLE");
        });
        if (bundle.getIncludedProducts().size() < bundle.getMinProductsRequired()) {
            throw new BusinessException("Bundle must include at least " + bundle.getMinProductsRequired() + " products", "INSUFFICIENT_PRODUCTS");
        }
        ProductBundle saved = bundleRepository.save(bundle);
        log.info("AUDIT: Product bundle created by {}: code={}, products={}",
                currentActorProvider.getCurrentActor(), saved.getBundleCode(), saved.getIncludedProducts().size());
        return saved;
    }

    @Transactional
    public CustomerBundleEnrollment enroll(Long customerId, String bundleCode, List<String> selectedProducts) {
        ProductBundle bundle = bundleRepository.findByBundleCode(bundleCode)
                .orElseThrow(() -> new ResourceNotFoundException("ProductBundle", "bundleCode", bundleCode));
        if (!"ACTIVE".equals(bundle.getStatus())) {
            throw new BusinessException("Bundle not active", "BUNDLE_INACTIVE");
        }
        if (selectedProducts.size() < bundle.getMinProductsRequired()) {
            throw new BusinessException("Must select at least " + bundle.getMinProductsRequired() + " products", "INSUFFICIENT_SELECTION");
        }

        // Validate selected products are actually in the bundle
        List<String> bundleProducts = bundle.getIncludedProducts();
        for (String selected : selectedProducts) {
            if (!bundleProducts.contains(selected)) {
                throw new BusinessException("Product " + selected + " is not part of bundle " + bundleCode, "INVALID_PRODUCT");
            }
        }

        // Duplicate enrollment check
        List<CustomerBundleEnrollment> existingEnrollments = enrollmentRepository.findByCustomerIdAndStatusOrderByEnrollmentDateDesc(customerId, "ACTIVE");
        boolean alreadyEnrolled = existingEnrollments.stream()
                .anyMatch(e -> bundle.getId().equals(e.getBundleId()));
        if (alreadyEnrolled) {
            throw new BusinessException("Customer " + customerId + " is already enrolled in bundle " + bundleCode, "DUPLICATE_ENROLLMENT");
        }

        // Apply discount
        BigDecimal discount = bundle.getBundleDiscountPct() != null ? bundle.getBundleDiscountPct() : BigDecimal.ZERO;

        CustomerBundleEnrollment enrollment = CustomerBundleEnrollment.builder()
                .customerId(customerId).bundleId(bundle.getId())
                .enrolledProducts(selectedProducts).discountApplied(discount).build();
        log.info("AUDIT: Bundle enrollment by {}: customer={}, bundle={}, products={}, discount={}%",
                currentActorProvider.getCurrentActor(), customerId, bundleCode, selectedProducts.size(), discount);
        return enrollmentRepository.save(enrollment);
    }

    @Transactional
    public CustomerBundleEnrollment unenroll(Long customerId, String bundleCode) {
        ProductBundle bundle = bundleRepository.findByBundleCode(bundleCode)
                .orElseThrow(() -> new ResourceNotFoundException("ProductBundle", "bundleCode", bundleCode));

        List<CustomerBundleEnrollment> enrollments = enrollmentRepository.findByCustomerIdAndStatusOrderByEnrollmentDateDesc(customerId, "ACTIVE");
        CustomerBundleEnrollment enrollment = enrollments.stream()
                .filter(e -> bundle.getId().equals(e.getBundleId()))
                .findFirst()
                .orElseThrow(() -> new BusinessException("Customer " + customerId + " is not enrolled in bundle " + bundleCode, "NOT_ENROLLED"));

        enrollment.setStatus("CANCELLED");
        enrollment.setDiscountApplied(BigDecimal.ZERO);
        log.info("AUDIT: Bundle unenrollment by {}: customer={}, bundle={}",
                currentActorProvider.getCurrentActor(), customerId, bundleCode);
        return enrollmentRepository.save(enrollment);
    }

    public List<ProductBundle> getActiveBundles() {
        return bundleRepository.findByStatusOrderByBundleNameAsc("ACTIVE");
    }

    public List<CustomerBundleEnrollment> getCustomerEnrollments(Long customerId) {
        return enrollmentRepository.findByCustomerIdAndStatusOrderByEnrollmentDateDesc(customerId, "ACTIVE");
    }
}

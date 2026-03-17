package com.cbs.productbundle.service;

import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.productbundle.entity.*;
import com.cbs.productbundle.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Service @RequiredArgsConstructor @Slf4j @Transactional(readOnly = true)
public class ProductBundleService {

    private final ProductBundleRepository bundleRepository;
    private final CustomerBundleEnrollmentRepository enrollmentRepository;

    @Transactional
    public ProductBundle createBundle(ProductBundle bundle) {
        bundleRepository.findByBundleCode(bundle.getBundleCode()).ifPresent(b -> {
            throw new BusinessException("Bundle code exists: " + bundle.getBundleCode());
        });
        if (bundle.getIncludedProducts().size() < bundle.getMinProductsRequired()) {
            throw new BusinessException("Bundle must include at least " + bundle.getMinProductsRequired() + " products");
        }
        return bundleRepository.save(bundle);
    }

    @Transactional
    public CustomerBundleEnrollment enroll(Long customerId, String bundleCode, List<String> selectedProducts) {
        ProductBundle bundle = bundleRepository.findByBundleCode(bundleCode)
                .orElseThrow(() -> new ResourceNotFoundException("ProductBundle", "bundleCode", bundleCode));
        if (!"ACTIVE".equals(bundle.getStatus())) throw new BusinessException("Bundle not active");
        if (selectedProducts.size() < bundle.getMinProductsRequired()) {
            throw new BusinessException("Must select at least " + bundle.getMinProductsRequired() + " products");
        }

        CustomerBundleEnrollment enrollment = CustomerBundleEnrollment.builder()
                .customerId(customerId).bundleId(bundle.getId())
                .enrolledProducts(selectedProducts).discountApplied(bundle.getBundleDiscountPct()).build();
        log.info("Bundle enrollment: customer={}, bundle={}, products={}", customerId, bundleCode, selectedProducts.size());
        return enrollmentRepository.save(enrollment);
    }

    public List<ProductBundle> getActiveBundles() { return bundleRepository.findByStatusOrderByBundleNameAsc("ACTIVE"); }
    public List<CustomerBundleEnrollment> getCustomerEnrollments(Long customerId) {
        return enrollmentRepository.findByCustomerIdAndStatusOrderByEnrolledAtDesc(customerId, "ACTIVE");
    }
}

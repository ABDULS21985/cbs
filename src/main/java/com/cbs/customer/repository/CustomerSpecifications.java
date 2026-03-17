package com.cbs.customer.repository;

import com.cbs.customer.dto.CustomerSearchCriteria;
import com.cbs.customer.entity.Customer;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.util.StringUtils;

import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;

public final class CustomerSpecifications {

    private CustomerSpecifications() {
    }

    public static Specification<Customer> fromCriteria(CustomerSearchCriteria criteria) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (StringUtils.hasText(criteria.getSearchTerm())) {
                String term = "%" + criteria.getSearchTerm().toLowerCase() + "%";
                Predicate namePredicate = cb.or(
                        cb.like(cb.lower(root.get("firstName")), term),
                        cb.like(cb.lower(root.get("lastName")), term),
                        cb.like(cb.lower(root.get("registeredName")), term),
                        cb.like(cb.lower(root.get("tradingName")), term),
                        cb.like(root.get("cifNumber"), "%" + criteria.getSearchTerm() + "%"),
                        cb.like(cb.lower(root.get("email")), term),
                        cb.like(root.get("phonePrimary"), "%" + criteria.getSearchTerm() + "%")
                );
                predicates.add(namePredicate);
            }

            if (criteria.getCustomerType() != null) {
                predicates.add(cb.equal(root.get("customerType"), criteria.getCustomerType()));
            }

            if (criteria.getStatus() != null) {
                predicates.add(cb.equal(root.get("status"), criteria.getStatus()));
            }

            if (criteria.getRiskRating() != null) {
                predicates.add(cb.equal(root.get("riskRating"), criteria.getRiskRating()));
            }

            if (StringUtils.hasText(criteria.getBranchCode())) {
                predicates.add(cb.equal(root.get("branchCode"), criteria.getBranchCode()));
            }

            if (StringUtils.hasText(criteria.getSectorCode())) {
                predicates.add(cb.equal(root.get("sectorCode"), criteria.getSectorCode()));
            }

            if (StringUtils.hasText(criteria.getIndustryCode())) {
                predicates.add(cb.equal(root.get("industryCode"), criteria.getIndustryCode()));
            }

            if (StringUtils.hasText(criteria.getNationality())) {
                predicates.add(cb.equal(root.get("nationality"), criteria.getNationality()));
            }

            if (StringUtils.hasText(criteria.getStateOfOrigin())) {
                predicates.add(cb.equal(root.get("stateOfOrigin"), criteria.getStateOfOrigin()));
            }

            if (criteria.getCreatedAfter() != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("createdAt"),
                        criteria.getCreatedAfter().atStartOfDay().toInstant(ZoneOffset.UTC)));
            }

            if (criteria.getCreatedBefore() != null) {
                predicates.add(cb.lessThanOrEqualTo(root.get("createdAt"),
                        criteria.getCreatedBefore().plusDays(1).atStartOfDay().toInstant(ZoneOffset.UTC)));
            }

            if (StringUtils.hasText(criteria.getRelationshipManager())) {
                predicates.add(cb.equal(root.get("relationshipManager"), criteria.getRelationshipManager()));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}

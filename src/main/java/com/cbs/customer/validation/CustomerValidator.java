package com.cbs.customer.validation;

import com.cbs.common.exception.BusinessException;
import com.cbs.customer.dto.CreateCustomerRequest;
import com.cbs.customer.entity.CustomerStatus;
import com.cbs.customer.entity.CustomerType;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.time.LocalDate;
import java.time.Period;
import java.util.Set;

@Component
@Slf4j
public class CustomerValidator {

    private static final int MINIMUM_AGE = 0;
    private static final int MAXIMUM_AGE = 150;
    private static final Set<String> VALID_INDIVIDUAL_TYPES = Set.of("INDIVIDUAL", "SOLE_PROPRIETOR");
    private static final Set<String> VALID_CORPORATE_TYPES = Set.of("SME", "CORPORATE", "TRUST", "GOVERNMENT", "NGO");

    /**
     * Status transition matrix — validates that status changes follow allowed paths.
     */
    private static final Set<String> ALLOWED_STATUS_TRANSITIONS = Set.of(
            "PROSPECT->ACTIVE",
            "ACTIVE->DORMANT",
            "ACTIVE->SUSPENDED",
            "ACTIVE->CLOSED",
            "ACTIVE->DECEASED",
            "DORMANT->ACTIVE",
            "DORMANT->CLOSED",
            "SUSPENDED->ACTIVE",
            "SUSPENDED->CLOSED"
    );

    public void validateCreateRequest(CreateCustomerRequest request) {
        CustomerType type = request.getCustomerType();

        if (VALID_INDIVIDUAL_TYPES.contains(type.name())) {
            validateIndividualFields(request);
        } else if (VALID_CORPORATE_TYPES.contains(type.name())) {
            validateCorporateFields(request);
        }

        validateCommonFields(request);
    }

    public void validateStatusTransition(CustomerStatus currentStatus, CustomerStatus newStatus) {
        String transition = currentStatus.name() + "->" + newStatus.name();
        if (!ALLOWED_STATUS_TRANSITIONS.contains(transition)) {
            throw new BusinessException(
                    String.format("Status transition from %s to %s is not allowed", currentStatus, newStatus),
                    "INVALID_STATUS_TRANSITION"
            );
        }
    }

    private void validateIndividualFields(CreateCustomerRequest request) {
        if (!StringUtils.hasText(request.getFirstName())) {
            throw new BusinessException("First name is required for individual customers", "MISSING_FIRST_NAME");
        }
        if (!StringUtils.hasText(request.getLastName())) {
            throw new BusinessException("Last name is required for individual customers", "MISSING_LAST_NAME");
        }
        if (request.getDateOfBirth() == null) {
            throw new BusinessException("Date of birth is required for individual customers", "MISSING_DOB");
        }
        int age = Period.between(request.getDateOfBirth(), LocalDate.now()).getYears();
        if (age < MINIMUM_AGE || age > MAXIMUM_AGE) {
            throw new BusinessException("Invalid date of birth", "INVALID_DOB");
        }
    }

    private void validateCorporateFields(CreateCustomerRequest request) {
        if (!StringUtils.hasText(request.getRegisteredName())) {
            throw new BusinessException("Registered name is required for corporate customers", "MISSING_REG_NAME");
        }
    }

    private void validateCommonFields(CreateCustomerRequest request) {
        if (!StringUtils.hasText(request.getEmail()) && !StringUtils.hasText(request.getPhonePrimary())) {
            throw new BusinessException("At least one contact method (email or phone) is required", "MISSING_CONTACT");
        }
    }
}

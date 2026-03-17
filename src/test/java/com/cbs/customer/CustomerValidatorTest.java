package com.cbs.customer;

import com.cbs.common.exception.BusinessException;
import com.cbs.customer.dto.CreateCustomerRequest;
import com.cbs.customer.entity.CustomerStatus;
import com.cbs.customer.entity.CustomerType;
import com.cbs.customer.validation.CustomerValidator;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class CustomerValidatorTest {

    private CustomerValidator validator;

    @BeforeEach
    void setUp() {
        validator = new CustomerValidator();
    }

    @Test
    @DisplayName("Valid individual request passes validation")
    void validIndividual() {
        CreateCustomerRequest request = CreateCustomerRequest.builder()
                .customerType(CustomerType.INDIVIDUAL)
                .firstName("Amina")
                .lastName("Bakare")
                .dateOfBirth(LocalDate.of(1990, 1, 1))
                .email("amina@example.com")
                .build();
        assertThatCode(() -> validator.validateCreateRequest(request)).doesNotThrowAnyException();
    }

    @Test
    @DisplayName("Individual missing first name fails")
    void individualMissingFirstName() {
        CreateCustomerRequest request = CreateCustomerRequest.builder()
                .customerType(CustomerType.INDIVIDUAL)
                .lastName("Bakare")
                .dateOfBirth(LocalDate.of(1990, 1, 1))
                .email("a@b.com")
                .build();
        assertThatThrownBy(() -> validator.validateCreateRequest(request))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("First name");
    }

    @Test
    @DisplayName("Individual missing DOB fails")
    void individualMissingDob() {
        CreateCustomerRequest request = CreateCustomerRequest.builder()
                .customerType(CustomerType.INDIVIDUAL)
                .firstName("Amina")
                .lastName("Bakare")
                .email("a@b.com")
                .build();
        assertThatThrownBy(() -> validator.validateCreateRequest(request))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("Date of birth");
    }

    @Test
    @DisplayName("Corporate missing registered name fails")
    void corporateMissingRegName() {
        CreateCustomerRequest request = CreateCustomerRequest.builder()
                .customerType(CustomerType.CORPORATE)
                .email("info@corp.ng")
                .build();
        assertThatThrownBy(() -> validator.validateCreateRequest(request))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("Registered name");
    }

    @Test
    @DisplayName("Missing both email and phone fails")
    void missingContact() {
        CreateCustomerRequest request = CreateCustomerRequest.builder()
                .customerType(CustomerType.CORPORATE)
                .registeredName("Acme Ltd")
                .build();
        assertThatThrownBy(() -> validator.validateCreateRequest(request))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("contact method");
    }

    @Test
    @DisplayName("Valid status transition ACTIVE -> DORMANT")
    void validStatusTransition() {
        assertThatCode(() -> validator.validateStatusTransition(CustomerStatus.ACTIVE, CustomerStatus.DORMANT))
                .doesNotThrowAnyException();
    }

    @Test
    @DisplayName("Invalid status transition DORMANT -> SUSPENDED")
    void invalidStatusTransition() {
        assertThatThrownBy(() -> validator.validateStatusTransition(CustomerStatus.DORMANT, CustomerStatus.SUSPENDED))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("not allowed");
    }

    @Test
    @DisplayName("Valid status transition DORMANT -> ACTIVE (reactivation)")
    void reactivation() {
        assertThatCode(() -> validator.validateStatusTransition(CustomerStatus.DORMANT, CustomerStatus.ACTIVE))
                .doesNotThrowAnyException();
    }
}
